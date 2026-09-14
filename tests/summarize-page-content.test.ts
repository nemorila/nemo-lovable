import { describe, it, expect } from 'vitest';
import { summarizePageContent } from '@/lib/plan/summarize-page-content';

describe('summarizePageContent', () => {
  it('keeps heading lines regardless of length', () => {
    const result = summarizePageContent('# Om oss\n\n## Kontakt');
    expect(result).toContain('# Om oss');
    expect(result).toContain('## Kontakt');
  });

  it('drops short link-only lines typical of nav/footer', () => {
    const markdown = [
      '[Hem](/)',
      '[Om oss](/om)',
      '[Kontakt](/kontakt)',
      'Vi är ett lokalt företag som har hjälpt kunder i regionen i över tio år.',
    ].join('\n');

    const result = summarizePageContent(markdown);

    expect(result).not.toContain('Hem');
    expect(result).not.toContain('Om oss');
    expect(result).toContain('Vi är ett lokalt företag som har hjälpt kunder i regionen i över tio år.');
  });

  it('strips markdown link syntax but keeps the anchor text for long lines', () => {
    const markdown = 'Läs mer om [våra tjänster](/tjanster) och hur vi kan hjälpa just dig idag.';
    const result = summarizePageContent(markdown);
    expect(result).toContain('Läs mer om våra tjänster och hur vi kan hjälpa just dig idag.');
    expect(result).not.toContain('](');
  });

  it('truncates the result at maxChars', () => {
    const longParagraph = 'Detta är en lång mening med många ord upprepad flera gånger. '.repeat(50);
    const result = summarizePageContent(longParagraph, 100);
    expect(result.length).toBeLessThanOrEqual(101);
    expect(result.endsWith('…')).toBe(true);
  });
});
