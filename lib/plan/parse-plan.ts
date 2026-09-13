import { projectPlanSchema, type ProjectPlan } from '@/types/plan';

/**
 * Extracts the first balanced JSON object from a string.
 *
 * A greedy /\{[\s\S]*\}/ regex breaks on a `}` inside a string value, so this
 * walks the text tracking string and escape state instead. Returns null when
 * there is no balanced object.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

/**
 * Parses a model response into a validated ProjectPlan.
 *
 * Handles raw JSON, JSON wrapped in ```json fences, and JSON surrounded by
 * prose. Used as the fallback in /api/plan-project when generateObject's
 * structured output fails, which is what happens with models that cannot honour
 * a JSON schema.
 *
 * Throws an Error with a readable message on anything it cannot parse - it
 * never returns a partial or unvalidated plan.
 */
export function parsePlanResponse(raw: unknown): ProjectPlan {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Plan response was empty or not a string');
  }

  // Strip ```json / ``` fences before looking for the object
  const withoutFences = raw.replace(/```(?:json)?/gi, '');
  const candidate = extractJsonObject(withoutFences);

  if (!candidate) {
    throw new Error(
      `No JSON object found in plan response (received ${raw.length} chars starting with: ${raw.slice(0, 60)})`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (error) {
    throw new Error(`Plan response contained invalid JSON: ${(error as Error).message}`);
  }

  const result = projectPlanSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Plan response did not match the expected shape: ${issues}`);
  }

  return result.data;
}
