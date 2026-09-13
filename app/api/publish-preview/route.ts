import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, PREVIEW_BUCKET, isSupabaseConfigured } from '@/lib/supabase/server';
import { contentTypeFor } from '@/lib/preview/content-type';
import type { SandboxProvider } from '@/lib/sandbox/types';

export const dynamic = 'force-dynamic';

declare global {
  var activeSandboxProvider: any;
}

const DIST_DIR = '/home/user/app/dist';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
    }

    const provider: SandboxProvider | null = global.activeSandboxProvider ?? null;
    if (!provider) {
      return NextResponse.json({ success: false, error: 'No active sandbox to build from' }, { status: 409 });
    }

    console.log(`[publish-preview] Building project ${projectId}...`);
    const build = await provider.runCommand('npm run build');
    if (!build.success) {
      console.error('[publish-preview] vite build failed:', build.stderr || build.stdout);
      return NextResponse.json(
        { success: false, error: 'Build failed', details: build.stderr || build.stdout },
        { status: 422 }
      );
    }

    const distPaths = await provider.listFiles(DIST_DIR);
    if (distPaths.length === 0) {
      return NextResponse.json({ success: false, error: 'Build produced no files' }, { status: 422 });
    }

    const storage = getSupabaseAdmin().storage.from(PREVIEW_BUCKET);
    const uploaded: string[] = [];

    for (const relativePath of distPaths) {
      // Binary-safe: readFile() would corrupt images and fonts.
      const bytes = await provider.readFileBytes(`${DIST_DIR}/${relativePath}`);

      const { error } = await storage.upload(`${projectId}/${relativePath}`, bytes, {
        contentType: contentTypeFor(relativePath),
        upsert: true,
      });

      if (error) {
        console.error(`[publish-preview] Upload failed for ${relativePath}:`, error.message);
        continue;
      }
      uploaded.push(relativePath);
    }

    await removeStaleObjects(projectId, uploaded);

    console.log(`[publish-preview] Published ${uploaded.length} files for project ${projectId}`);

    return NextResponse.json({
      success: true,
      projectId,
      filesUploaded: uploaded.length,
      previewUrl: `/preview/${projectId}/`,
    });
  } catch (error) {
    console.error('[publish-preview] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Vite fingerprints its asset filenames, so without this every rebuild leaves
 * the previous bundle behind in the bucket forever.
 */
async function removeStaleObjects(projectId: string, keepRelativePaths: string[]) {
  const storage = getSupabaseAdmin().storage.from(PREVIEW_BUCKET);
  const keep = new Set(keepRelativePaths);
  const stale: string[] = [];

  const walk = async (prefix: string) => {
    const { data, error } = await storage.list(prefix, { limit: 1000 });
    if (error || !data) return;

    for (const entry of data) {
      const fullPath = `${prefix}/${entry.name}`;
      // Storage marks directories by having no id
      if (!entry.id) {
        await walk(fullPath);
        continue;
      }
      const relative = fullPath.slice(projectId.length + 1);
      if (!keep.has(relative)) stale.push(fullPath);
    }
  };

  await walk(projectId);

  if (stale.length > 0) {
    const { error } = await storage.remove(stale);
    if (error) {
      console.error('[publish-preview] Failed to remove stale objects:', error.message);
    } else {
      console.log(`[publish-preview] Removed ${stale.length} stale objects`);
    }
  }
}
