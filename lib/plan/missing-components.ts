import type { ProjectPlan, PlannedComponent } from '@/types/plan';

/**
 * Mirrors the path normalization in apply-ai-code-stream's write loop so that a
 * planned component path and a generated file path can be compared.
 */
const CONFIG_FILES = [
  'index.html',
  'package.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
];

export function normalizePlanPath(rawPath: string): string {
  let normalized = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
  const fileName = normalized.split('/').pop() || '';

  if (
    !normalized.startsWith('src/') &&
    !normalized.startsWith('public/') &&
    normalized !== 'index.html' &&
    !CONFIG_FILES.includes(fileName)
  ) {
    normalized = 'src/' + normalized;
  }

  return normalized;
}

/**
 * Returns the planned components that have no matching generated file, in the
 * order they appear in the plan.
 *
 * Matching is CASE SENSITIVE on purpose: a component planned as `Header` but
 * written as `header.jsx` resolves fine on macOS and then fails to build on a
 * case-sensitive filesystem. Treating it as missing surfaces that immediately
 * instead of shipping a broken import.
 */
export function findMissingComponents(
  plan: Pick<ProjectPlan, 'components'> | null | undefined,
  writtenPaths: string[]
): PlannedComponent[] {
  if (!plan?.components?.length) return [];

  const normalizedWritten = new Set(writtenPaths.map(normalizePlanPath));
  const writtenBaseNames = new Set(
    writtenPaths.map(p => (p.split('/').pop() || '').replace(/\.[^.]+$/, ''))
  );

  return plan.components.filter(component => {
    const expectedPath = normalizePlanPath(component.path || `components/${component.name}.jsx`);
    if (normalizedWritten.has(expectedPath)) return false;
    return !writtenBaseNames.has(component.name);
  });
}
