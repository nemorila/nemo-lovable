import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectRow } from '@/lib/projects/store';

const getProject = vi.fn();
vi.mock('@/lib/projects/store', () => ({
  getProject: (...args: unknown[]) => getProject(...args),
}));

const { checkOwnership, requireOwnedProject } = await import('@/lib/projects/authorize');

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: 'project-1',
    owner_id: 'user-1',
    name: 'Untitled',
    files: {},
    plan: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('checkOwnership', () => {
  it('returns 404 when the project does not exist', () => {
    const result = checkOwnership(null, 'user-1');
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('returns 403 when the project belongs to someone else', () => {
    const project = makeProject({ owner_id: 'someone-else' });
    const result = checkOwnership(project, 'user-1');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('returns 403 when the project has no owner, even for a signed-in user', () => {
    // A never-claimed project must not become "ok" just because nobody owns
    // it - otherwise any signed-in user could claim it by guessing its id.
    const project = makeProject({ owner_id: null });
    const result = checkOwnership(project, 'user-1');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('returns ok with the project when owner_id matches', () => {
    const project = makeProject({ owner_id: 'user-1' });
    const result = checkOwnership(project, 'user-1');
    expect(result).toEqual({ ok: true, project });
  });
});

describe('requireOwnedProject', () => {
  beforeEach(() => {
    getProject.mockReset();
  });

  it('looks up the project and rejects a non-owner with 403', async () => {
    getProject.mockResolvedValue(makeProject({ id: 'p1', owner_id: 'owner-a' }));

    const result = await requireOwnedProject('p1', 'owner-b');

    expect(getProject).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('returns 404 when the project lookup finds nothing', async () => {
    getProject.mockResolvedValue(null);

    const result = await requireOwnedProject('missing', 'owner-a');

    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('resolves ok with the project when the caller owns it', async () => {
    const project = makeProject({ id: 'p1', owner_id: 'owner-a' });
    getProject.mockResolvedValue(project);

    const result = await requireOwnedProject('p1', 'owner-a');

    expect(result).toEqual({ ok: true, project });
  });
});
