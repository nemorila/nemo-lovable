/**
 * First 4-5 words of a free-text prompt, used as a placeholder project name
 * until the plan call (if any) returns a proper title.
 */
export function deriveProjectName(prompt: string, maxWords = 5, maxLength = 60): string {
  const cleaned = prompt.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Namnlöst projekt';

  const words = cleaned.split(' ').slice(0, maxWords);
  let name = words.join(' ').replace(/[.,;:!?]+$/, '');
  name = name.charAt(0).toUpperCase() + name.slice(1);

  if (name.length > maxLength) {
    name = name.slice(0, maxLength - 1).trimEnd() + '…';
  }

  return name;
}
