import { NextRequest, NextResponse } from 'next/server';
import { getProject, saveProjectFiles, saveProjectPlan } from '@/lib/projects/store';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
    }

    const { id } = await params;
    const project = await getProject(id);

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
    }

    const { id } = await params;
    const { plan, files } = await request.json();

    // The plan is saved the moment it is approved - it must not wait for a
    // successful build to become durable.
    if (plan) await saveProjectPlan(id, plan);
    if (files) await saveProjectFiles(id, files);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[projects] Update failed:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
