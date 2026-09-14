import { getProject, type ProjectRow } from '@/lib/projects/store';

export type OwnershipResult =
  | { ok: true; project: ProjectRow }
  | { ok: false; status: 404 }
  | { ok: false; status: 403 };

/**
 * Pure ownership decision, kept separate from the DB lookup so it can be
 * unit-tested without mocking Supabase.
 *
 * A project with no owner_id is never "ok" just because nobody owns it yet -
 * that would let any signed-in user claim it by guessing an id.
 */
export function checkOwnership(project: ProjectRow | null, userId: string): OwnershipResult {
  if (!project) return { ok: false, status: 404 };
  if (project.owner_id !== userId) return { ok: false, status: 403 };
  return { ok: true, project };
}

export async function requireOwnedProject(id: string, userId: string): Promise<OwnershipResult> {
  const project = await getProject(id);
  return checkOwnership(project, userId);
}
