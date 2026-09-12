import type { SandboxProvider } from './types';
import { SandboxFactory } from './factory';
import { sandboxManager } from './sandbox-manager';
import { appConfig } from '@/config/app.config';
import type { SandboxState } from '@/types/sandbox';

declare global {
  var activeSandbox: any;
  var activeSandboxProvider: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

// Files the Vite scaffold always recreates via setupViteApp()
const SCAFFOLD_FILES = [
  'src/App.jsx',
  'src/main.jsx',
  'src/index.css',
  'index.html',
  'package.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js'
];

// E2B reports an expired/killed sandbox in several shapes depending on which
// SDK call hit it, so match on all of them rather than one exact string.
const SANDBOX_GONE_PATTERNS = [
  'sandbox not found',
  'sandbox was not found',
  'sandbox does not exist',
  'sandbox is not running',
  'sandbox has been closed',
  'sandbox timeout',
  'no active sandbox'
];

/**
 * True when an error means "the sandbox this code was talking to is gone".
 * Covers both E2B's own not-found errors and our providers' "No active sandbox"
 * guard, which is what surfaces when the server lost its in-memory state.
 */
export function isSandboxNotFoundError(error: unknown): boolean {
  if (!error) return false;

  const err = error as any;

  if (err?.name === 'NotFoundError') return true;
  if (err?.status === 404 || err?.statusCode === 404 || err?.code === 404) return true;

  const haystack = [
    typeof error === 'string' ? error : '',
    err?.message,
    err?.body?.message,
    err?.error?.message,
    err?.cause?.message
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return SANDBOX_GONE_PATTERNS.some(pattern => haystack.includes(pattern));
}

export type RecoveryStage = 'creating' | 'restoring' | 'installing' | 'ready';

export interface RecoveryProgressEvent {
  stage: RecoveryStage;
  message: string;
  current?: number;
  total?: number;
  sandboxId?: string;
  url?: string;
}

export type RecoveryProgress = (event: RecoveryProgressEvent) => void | Promise<void>;

export interface SandboxRecoveryResult {
  sandboxId: string;
  url: string;
  provider: SandboxProvider;
  filesRestored: string[];
  filesFailed: string[];
  packagesInstalled: boolean;
}

// A single recovery can be triggered from several routes at once (the client
// often has a file fetch in flight when an apply fails). Share one run so we
// don't spin up several sandboxes for the same outage.
let inFlightRecovery: Promise<SandboxRecoveryResult> | null = null;

/**
 * Replace a dead sandbox with a fresh one, restore the last known file tree
 * from the in-memory cache, reinstall dependencies and repoint all global state
 * at the new sandbox.
 */
export async function recoverSandbox(onProgress?: RecoveryProgress): Promise<SandboxRecoveryResult> {
  if (inFlightRecovery) {
    return inFlightRecovery;
  }

  inFlightRecovery = performRecovery(onProgress).finally(() => {
    inFlightRecovery = null;
  });

  return inFlightRecovery;
}

async function performRecovery(onProgress?: RecoveryProgress): Promise<SandboxRecoveryResult> {
  // Snapshot the cache BEFORE tearing anything down - this is the only record
  // of the user's project once the sandbox is gone.
  const cachedFiles = { ...(global.sandboxState?.fileCache?.files ?? {}) };
  const cachedManifest = global.sandboxState?.fileCache?.manifest;
  const cachedPaths = Object.keys(cachedFiles);

  console.log(`[recovery] Sandbox lost - rebuilding with ${cachedPaths.length} cached files`);

  // Drop the dead handles. These calls talk to a sandbox that no longer exists,
  // so failures here are expected and must not abort the recovery.
  try {
    await sandboxManager.terminateAll();
  } catch (error) {
    console.error('[recovery] Failed to clean up sandbox manager:', error);
  }
  try {
    await global.activeSandboxProvider?.terminate?.();
  } catch (error) {
    console.error('[recovery] Failed to terminate stale provider:', error);
  }
  global.activeSandboxProvider = null;
  global.activeSandbox = null;

  await onProgress?.({ stage: 'creating', message: 'Startar om miljön…' });

  const provider = SandboxFactory.create();
  const info = await provider.createSandbox();
  await provider.setupViteApp();

  const filesRestored: string[] = [];
  const filesFailed: string[] = [];

  if (cachedPaths.length > 0) {
    await onProgress?.({
      stage: 'restoring',
      message: `Återställer ${cachedPaths.length} filer…`,
      total: cachedPaths.length
    });

    for (const [index, path] of cachedPaths.entries()) {
      try {
        const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
        if (dirPath) {
          await provider.runCommand(`mkdir -p ${dirPath}`);
        }
        await provider.writeFile(path, cachedFiles[path].content);
        filesRestored.push(path);
      } catch (error) {
        console.error(`[recovery] Failed to restore ${path}:`, error);
        filesFailed.push(path);
      }

      await onProgress?.({
        stage: 'restoring',
        message: `Återställer filer… (${index + 1}/${cachedPaths.length})`,
        current: index + 1,
        total: cachedPaths.length
      });
    }
  }

  await onProgress?.({ stage: 'installing', message: 'Installerar beroenden…' });

  let packagesInstalled = false;
  try {
    const flags = appConfig.packages.useLegacyPeerDeps ? ' --legacy-peer-deps' : '';
    const installResult = await provider.runCommand(`npm install${flags}`);
    packagesInstalled = installResult.success;
    if (!installResult.success) {
      console.error('[recovery] npm install reported a failure:', installResult.stderr);
    }
  } catch (error) {
    console.error('[recovery] npm install failed:', error);
  }

  // The scaffold started Vite before the restored files landed, so restart it
  // to pick up the real project.
  try {
    await provider.restartViteServer();
  } catch (error) {
    console.error('[recovery] Failed to restart Vite:', error);
  }

  // Repoint every piece of state at the new sandbox.
  sandboxManager.registerSandbox(info.sandboxId, provider);
  global.activeSandboxProvider = provider;
  // Deliberately left null: global.activeSandbox is the v1 Vercel sandbox handle
  // (runCommand({cmd, args})), which is a different API from a provider or a raw
  // E2B sandbox. Putting either one there would break the legacy routes further.
  global.activeSandbox = null;
  global.sandboxData = { sandboxId: info.sandboxId, url: info.url };
  global.sandboxState = {
    fileCache: {
      files: cachedFiles,
      lastSync: Date.now(),
      sandboxId: info.sandboxId,
      manifest: cachedManifest
    },
    sandbox: provider,
    sandboxData: { sandboxId: info.sandboxId, url: info.url }
  };
  global.existingFiles = new Set<string>([...SCAFFOLD_FILES, ...filesRestored]);

  console.log(
    `[recovery] Sandbox ${info.sandboxId} ready - restored ${filesRestored.length}/${cachedPaths.length} files`
  );

  await onProgress?.({
    stage: 'ready',
    message: 'Miljön är igång igen.',
    sandboxId: info.sandboxId,
    url: info.url
  });

  return {
    sandboxId: info.sandboxId,
    url: info.url,
    provider,
    filesRestored,
    filesFailed,
    packagesInstalled
  };
}

/**
 * Run a sandbox operation, and if it fails because the sandbox is gone, rebuild
 * the sandbox and run it once more against the replacement.
 *
 * The returned `recovery` is non-null when a rebuild happened - routes should
 * pass it back to the client so it can adopt the new sandbox id.
 */
export async function runWithSandboxRecovery<T>(
  run: (provider: any) => Promise<T>,
  options: { provider?: any; onProgress?: RecoveryProgress } = {}
): Promise<{ result: T; recovery: SandboxRecoveryResult | null }> {
  const provider = options.provider ?? global.activeSandboxProvider;

  try {
    if (!provider) {
      throw new Error('No active sandbox');
    }
    return { result: await run(provider), recovery: null };
  } catch (error) {
    if (!isSandboxNotFoundError(error)) {
      throw error;
    }

    console.log('[recovery] Operation hit a missing sandbox, rebuilding…');
    const recovery = await recoverSandbox(options.onProgress);
    return { result: await run(recovery.provider), recovery };
  }
}
