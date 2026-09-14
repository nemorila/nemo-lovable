import { describe, it, expect } from 'vitest';
import { deriveProjectName } from '@/lib/projects/name';

describe('deriveProjectName', () => {
  it('takes the first 5 words by default', () => {
    const name = deriveProjectName('En hemsida för en takläggare i Uppsala med tjänster');
    expect(name).toBe('En hemsida för en takläggare');
  });

  it('trims trailing punctuation', () => {
    const name = deriveProjectName('Bygg en portfolio.');
    expect(name).toBe('Bygg en portfolio');
  });

  it('capitalizes the first letter', () => {
    const name = deriveProjectName('en enkel bokningssida');
    expect(name).toBe('En enkel bokningssida');
  });

  it('truncates long names to maxLength', () => {
    const name = deriveProjectName('Enormtlångtordsomensamtöverskridergränsenpåegenhand', 5, 20);
    expect(name.length).toBeLessThanOrEqual(20);
    expect(name.endsWith('…')).toBe(true);
  });

  it('falls back to a placeholder for empty input', () => {
    expect(deriveProjectName('   ')).toBe('Namnlöst projekt');
  });
});
