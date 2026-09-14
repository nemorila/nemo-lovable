import { NextRequest, NextResponse } from 'next/server';
import { createProject, listProjects } from '@/lib/projects/store';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await listProjects(user.id);
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('[projects] List failed:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const project = await createProject(body?.name || 'Untitled', user.id);

    console.log('[projects] Created project', project.id);

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('[projects] Create failed:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
