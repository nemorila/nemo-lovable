import { NextRequest, NextResponse } from 'next/server';
import { saveProjectFiles, saveProjectPlan, saveProjectName, deleteProject } from '@/lib/projects/store';
import { requireOwnedProject } from '@/lib/projects/authorize';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function ownershipErrorResponse(status: 403 | 404) {
  return NextResponse.json(
    { success: false, error: status === 404 ? 'Project not found' : 'Forbidden' },
    { status }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await requireOwnedProject(id, user.id);
    if (!result.ok) return ownershipErrorResponse(result.status);

    return NextResponse.json({ success: true, project: result.project });
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

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await requireOwnedProject(id, user.id);
    if (!result.ok) return ownershipErrorResponse(result.status);

    const { plan, files, name } = await request.json();

    // The plan is saved the moment it is approved - it must not wait for a
    // successful build to become durable.
    if (plan) await saveProjectPlan(id, plan);
    if (files) await saveProjectFiles(id, files);
    if (name) await saveProjectName(id, name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[projects] Update failed:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await requireOwnedProject(id, user.id);
    if (!result.ok) return ownershipErrorResponse(result.status);

    await deleteProject(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[projects] Delete failed:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
