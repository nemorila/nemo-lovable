import { describe, it, expect } from 'vitest';
import { parsePlanResponse } from '@/lib/plan/parse-plan';
import { projectPlanSchema } from '@/types/plan';

// A minimal plan that satisfies every required field.
const validPlan = {
  name: 'Enkel landningssida',
  summary: 'En enkel landningssida',
  sections: [{ name: 'Hjältesektion', description: 'Rubrik och knapp' }],
  components: [
    { name: 'Header', path: 'src/components/Header.jsx', description: 'Navigering' },
  ],
  packages: [],
  theme: { colors: ['#0F172A'], typography: 'Inter', mood: 'Modern' },
  questions: ['Vilken målgrupp?'],
};

describe('parsePlanResponse', () => {
  it('parses plain JSON', () => {
    const plan = parsePlanResponse(JSON.stringify(validPlan));

    expect(plan.summary).toBe('En enkel landningssida');
    expect(plan.components).toHaveLength(1);
    expect(plan.components[0].name).toBe('Header');
  });

  it('parses JSON wrapped in a ```json fence', () => {
    const raw = '```json\n' + JSON.stringify(validPlan, null, 2) + '\n```';

    const plan = parsePlanResponse(raw);

    expect(plan.summary).toBe('En enkel landningssida');
    expect(plan.sections[0].name).toBe('Hjältesektion');
  });

  it('parses JSON with prose before and after it', () => {
    const raw = [
      'Här är planen jag föreslår för din sida:',
      JSON.stringify(validPlan),
      'Säg till om du vill ändra något!',
    ].join('\n\n');

    const plan = parsePlanResponse(raw);

    expect(plan.components[0].path).toBe('src/components/Header.jsx');
  });

  it('does not stop at a closing brace inside a string value', () => {
    const trickyPlan = {
      ...validPlan,
      summary: 'Visar kodexempel som { "a": 1 } i en ruta',
    };

    const plan = parsePlanResponse(`Förklaring: ${JSON.stringify(trickyPlan)} klart.`);

    expect(plan.summary).toBe('Visar kodexempel som { "a": 1 } i en ruta');
    expect(plan.components).toHaveLength(1);
  });

  it('defaults questions to an empty array when the field is absent', () => {
    const { questions, ...withoutQuestions } = validPlan;
    void questions;

    const plan = parsePlanResponse(JSON.stringify(withoutQuestions));

    expect(plan.questions).toEqual([]);
  });

  it('accepts an explicitly empty questions array', () => {
    const plan = parsePlanResponse(JSON.stringify({ ...validPlan, questions: [] }));

    expect(plan.questions).toEqual([]);
  });

  it('accepts an empty components array', () => {
    const plan = parsePlanResponse(JSON.stringify({ ...validPlan, components: [] }));

    expect(plan.components).toEqual([]);
  });

  it('preserves Swedish characters in sections and descriptions', () => {
    const swedishPlan = {
      ...validPlan,
      sections: [
        { name: 'Översikt', description: 'Kort förklaring på svenska' },
        { name: 'Tjänster', description: 'Våra erbjudanden' },
      ],
      components: [
        {
          name: 'Hero',
          path: 'src/components/Hero.jsx',
          description: 'Rubrik med åäö och långa ord',
        },
      ],
    };

    const plan = parsePlanResponse('```json\n' + JSON.stringify(swedishPlan) + '\n```');

    expect(plan.sections[0].name).toBe('Översikt');
    expect(plan.sections[1].name).toBe('Tjänster');
    expect(plan.sections[0].description).toBe('Kort förklaring på svenska');
    expect(plan.components[0].description).toBe('Rubrik med åäö och långa ord');
  });

  it('throws a clear error for a response with no JSON at all', () => {
    expect(() => parsePlanResponse('Tyvärr kan jag inte hjälpa till med det.')).toThrow(
      /No JSON object found/
    );
  });

  it('throws a clear error for malformed JSON', () => {
    expect(() => parsePlanResponse('{ "summary": "trasig", ')).toThrow(/No JSON object found/);
    expect(() => parsePlanResponse('{ "summary": trasig }')).toThrow(/invalid JSON/);
  });

  it('throws a clear error when the JSON does not match the plan shape', () => {
    expect(() => parsePlanResponse(JSON.stringify({ summary: 'bara en text' }))).toThrow(
      /did not match the expected shape/
    );
  });

  it('does not crash on empty, whitespace or non-string input', () => {
    expect(() => parsePlanResponse('')).toThrow(/empty or not a string/);
    expect(() => parsePlanResponse('   ')).toThrow(/empty or not a string/);
    expect(() => parsePlanResponse(undefined)).toThrow(/empty or not a string/);
    expect(() => parsePlanResponse(null)).toThrow(/empty or not a string/);
    expect(() => parsePlanResponse({ summary: 'objekt' })).toThrow(/empty or not a string/);
  });
});

// This schema is what generateObject validates against on every planning call,
// so it is worth testing directly and not only through the text parser.
describe('projectPlanSchema', () => {
  it('accepts a complete plan object', () => {
    const result = projectPlanSchema.safeParse(validPlan);

    expect(result.success).toBe(true);
  });

  it('rejects an object without sections', () => {
    const { sections, ...withoutSections } = validPlan;
    void sections;

    const result = projectPlanSchema.safeParse(withoutSections);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some(i => i.path.includes('sections'))).toBe(true);
  });

  it('rejects an object without components', () => {
    const { components, ...withoutComponents } = validPlan;
    void components;

    const result = projectPlanSchema.safeParse(withoutComponents);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some(i => i.path.includes('components'))).toBe(true);
  });

  it('allows questions to be absent or empty', () => {
    const { questions, ...withoutQuestions } = validPlan;
    void questions;

    const absent = projectPlanSchema.safeParse(withoutQuestions);
    const empty = projectPlanSchema.safeParse({ ...validPlan, questions: [] });

    expect(absent.success).toBe(true);
    expect(absent.data?.questions).toEqual([]);
    expect(empty.success).toBe(true);
    expect(empty.data?.questions).toEqual([]);
  });
});
