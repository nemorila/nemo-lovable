/**
 * Reduces scraped page markdown to just headings and body paragraphs, dropping
 * nav/footer link lists, so the reference context sent to the planning call
 * stays small.
 */
export function summarizePageContent(markdown: string, maxChars = 3000): string {
  const lines = markdown.split('\n');
  const kept: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const isHeading = /^#{1,6}\s+/.test(line);
    const withoutLinks = line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '');
    const wordCount = withoutLinks.split(/\s+/).filter(Boolean).length;

    // Nav/footer rows are typically link-only and short; body paragraphs and
    // headings are longer or explicitly marked.
    if (isHeading || wordCount >= 6) {
      kept.push(withoutLinks);
    }
  }

  const result = kept.join('\n');
  return result.length > maxChars ? result.slice(0, maxChars).trim() + '…' : result;
}
