import { getSupabaseAdmin, isSupabaseConfigured, PREVIEW_BUCKET } from '@/lib/supabase/admin';
import type { ProjectPlan } from '@/types/plan';

const TABLE = 'projects';

/** Path -> file content. Same shape as sandboxState.fileCache.files, minus lastModified. */
export type ProjectFiles = Record<string, string>;

export interface ProjectRow {
  id: string;
  owner_id: string | null;
  name: string;
  files: ProjectFiles;
  plan: ProjectPlan | null;
  created_at: string;
  updated_at: string;
}

export async function createProject(name = 'Untitled', ownerId?: string): Promise<ProjectRow> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .insert({ name, owner_id: ownerId ?? null })
    .select()
    .single();

  if (error) throw new Error(`Failed to create project: ${error.message}`);
  return data as ProjectRow;
}

export async function listProjects(ownerId: string): Promise<ProjectRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select()
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to list projects: ${error.message}`);
  return (data as ProjectRow[]) ?? [];
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) throw new Error(`Failed to delete project ${id}: ${error.message}`);

  // Best-effort: an orphaned preview build is harmless, so a storage failure
  // here must not fail the delete itself.
  try {
    const storage = getSupabaseAdmin().storage.from(PREVIEW_BUCKET);
    const { data } = await storage.list(id, { limit: 1000 });
    if (data && data.length > 0) {
      await storage.remove(data.map((entry) => `${id}/${entry.name}`));
    }
  } catch (error) {
    console.error(`[projects] Failed to clean up preview storage for ${id}:`, error);
  }
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select()
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load project ${id}: ${error.message}`);
  return (data as ProjectRow) ?? null;
}

export async function saveProjectFiles(id: string, files: ProjectFiles): Promise<void> {
  const { error } = await getSupabaseAdmin().from(TABLE).update({ files }).eq('id', id);
  if (error) throw new Error(`Failed to save files for project ${id}: ${error.message}`);
}

export async function saveProjectPlan(id: string, plan: ProjectPlan): Promise<void> {
  const { error } = await getSupabaseAdmin().from(TABLE).update({ plan }).eq('id', id);
  if (error) throw new Error(`Failed to save plan for project ${id}: ${error.message}`);
}

export async function saveProjectName(id: string, name: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from(TABLE).update({ name }).eq('id', id);
  if (error) throw new Error(`Failed to rename project ${id}: ${error.message}`);
}

/**
 * Best-effort persistence used from streaming routes.
 *
 * Persistence failing must never take down a build that otherwise succeeded, so
 * this logs and returns false instead of throwing. It also no-ops when Supabase
 * is not configured, which keeps the app runnable without it.
 */
export async function tryPersistProject(
  id: string | null | undefined,
  files: ProjectFiles,
  plan?: ProjectPlan | null
): Promise<boolean> {
  if (!id || !isSupabaseConfigured()) return false;

  try {
    const update: Record<string, unknown> = { files };
    if (plan) update.plan = plan;

    const { error } = await getSupabaseAdmin().from(TABLE).update(update).eq('id', id);
    if (error) throw new Error(error.message);

    console.log(`[projects] Saved ${Object.keys(files).length} files for project ${id}`);
    return true;
  } catch (error) {
    console.error(`[projects] Failed to persist project ${id}:`, error);
    return false;
  }
}

/** Reads a project's files, returning null when Supabase is unavailable or the row is gone. */
export async function tryLoadProjectFiles(
  id: string | null | undefined
): Promise<ProjectFiles | null> {
  if (!id || !isSupabaseConfigured()) return null;

  try {
    const project = await getProject(id);
    if (!project?.files || Object.keys(project.files).length === 0) return null;
    return project.files;
  } catch (error) {
    console.error(`[projects] Failed to load project ${id}:`, error);
    return null;
  }
}
