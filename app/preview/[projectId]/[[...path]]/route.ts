import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, PREVIEW_BUCKET, isSupabaseConfigured } from '@/lib/supabase/admin';
import {
  contentTypeFor,
  resolvePreviewObjectPath,
  buildingPlaceholderHtml,
} from '@/lib/preview/content-type';
import { getProject } from '@/lib/projects/store';
import { getSessionUser } from '@/lib/auth/session';
import { PREVIEW_STATUS_HEADER } from '@/lib/preview/constants';

export const dynamic = 'force-dynamic';

function placeholderResponse() {
  return new NextResponse(buildingPlaceholderHtml(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      [PREVIEW_STATUS_HEADER]: 'placeholder',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  const { projectId, path } = await params;
  const objectPath = resolvePreviewObjectPath(path);
  const isDocument = objectPath === 'index.html';

  if (!isSupabaseConfigured()) {
    return isDocument
      ? placeholderResponse()
      : new NextResponse('Preview storage is not configured', { status: 503 });
  }

  // Defense in depth: middleware already redirects unauthenticated requests
  // to /login for this path prefix, but the service-role client below
  // bypasses RLS, so ownership must be checked here regardless.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const project = await getProject(projectId);
  if (project && project.owner_id !== user.id) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(PREVIEW_BUCKET)
      .download(`${projectId}/${objectPath}`);

    if (error || !data) {
      // A missing document means the project has no published build yet - show
      // the placeholder rather than the browser's 404 page. Missing
      // sub-resources stay 404: they are not user-visible and must not be
      // masked as HTML.
      return isDocument
        ? placeholderResponse()
        : new NextResponse('Not found', { status: 404 });
    }

    return new NextResponse(await data.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(objectPath),
        // Vite fingerprints its assets, so they are safe to cache hard. The
        // document must not be, or a rebuild would not show up.
        'Cache-Control': isDocument
          ? 'no-store'
          : 'public, max-age=31536000, immutable',
        [PREVIEW_STATUS_HEADER]: 'ready',
      },
    });
  } catch (error) {
    console.error(`[preview] Failed to serve ${projectId}/${objectPath}:`, error);
    return isDocument
      ? placeholderResponse()
      : new NextResponse('Preview unavailable', { status: 500 });
  }
}
