import { NextResponse } from 'next/server';
import { appConfig } from '@/config/app.config';
import type { SandboxProvider } from '@/lib/sandbox/types';

export const dynamic = 'force-dynamic';

declare global {
  var activeSandboxProvider: any;
}

/**
 * Pushes the sandbox's idle timeout out while a tab is open.
 *
 * A missing sandbox is not an error here - the heartbeat fires on a timer and
 * must stay quiet when there is nothing to keep alive.
 */
export async function POST() {
  const provider: SandboxProvider | null = global.activeSandboxProvider ?? null;

  if (!provider) {
    return NextResponse.json({ success: true, alive: false });
  }

  try {
    await provider.extendTimeout(appConfig.e2b.timeoutMs);
    return NextResponse.json({
      success: true,
      alive: true,
      extendedByMs: appConfig.e2b.timeoutMs,
    });
  } catch (error) {
    console.error('[sandbox-heartbeat] Failed to extend timeout:', error);
    return NextResponse.json({ success: false, alive: false, error: (error as Error).message });
  }
}
