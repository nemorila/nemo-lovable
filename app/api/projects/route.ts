import { NextRequest, NextResponse } from 'next/server';
import { createProject } from '@/lib/projects/store';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const project = await createProject(body?.name || 'Untitled');

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
