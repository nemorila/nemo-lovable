import { NextRequest, NextResponse } from 'next/server';
import { generateObject, generateText } from 'ai';
import { getProviderForModel } from '@/lib/ai/provider-manager';
import { appConfig } from '@/config/app.config';
import { projectPlanSchema, type ProjectPlan } from '@/types/plan';
import { parsePlanResponse } from '@/lib/plan/parse-plan';

export const dynamic = 'force-dynamic';

const PLANNING_SYSTEM_PROMPT = `You are a senior React architect. You produce a BUILD PLAN for a Vite + React + Tailwind application. You NEVER write code.

CRITICAL OUTPUT RULES:
1. Return ONLY the structured plan. No code, no JSX, no file contents, no <file> tags.
2. LANGUAGE: detect the language of the user's request and write ALL prose in that same language - summary, section names and descriptions, component descriptions, theme mood and typography, and questions. If the user writes in Swedish, answer in Swedish. If English, English.
3. EXCEPTION - identifiers stay English ASCII: every "components[].name" MUST be a PascalCase ASCII identifier (Header, HeroSection, PricingTable) and every "components[].path" MUST be an ASCII path like "src/components/Header.jsx". These become real filenames, so they must never contain å, ä, ö, accents, spaces or non-Latin characters, no matter what language the rest of the plan is in.

PLANNING RULES:
- Every section in "sections" should map to at least one component in "components".
- Always include a Header (with navigation) and a Footer unless the user explicitly says otherwise.
- Component paths live under "src/components/", except App which is "src/App.jsx".
- Include "src/App.jsx" as a component - it composes the others.
- "packages" lists only npm packages actually needed beyond react and react-dom. Leave it empty for a plain Tailwind site. Do NOT include tailwindcss, vite or react - they are preinstalled.
- "theme.colors" is a short list of hex values that fit the request.
- "questions" holds genuine open questions where the request is ambiguous. Keep it short - at most three - and leave it empty when the request is already clear. Do not ask questions you can reasonably decide yourself.
- Keep the plan proportionate: a simple landing page is 4-7 components, not 20.`;

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      model = appConfig.ai.defaultModel,
      currentPlan,
      feedback,
      context,
    } = await request.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'prompt is required' },
        { status: 400 }
      );
    }

    const { client, actualModel } = getProviderForModel(model);

    const userParts: string[] = [`User request: ${prompt}`];

    if (context?.structure) {
      userParts.push(`\nExisting project structure:\n${context.structure}`);
    }

    // Revision round: keep the plan the user already saw and apply their change
    // rather than starting from scratch, so approved parts stay stable.
    if (currentPlan && feedback) {
      userParts.push(
        `\nYou previously produced this plan:\n${JSON.stringify(currentPlan, null, 2)}`,
        `\nThe user wants these changes: ${feedback}`,
        `\nReturn the FULL revised plan. Keep everything the user did not ask you to change exactly as it was. Answer in the same language as the user's change request.`
      );
    }

    const messages = [
      { role: 'system' as const, content: PLANNING_SYSTEM_PROMPT },
      { role: 'user' as const, content: userParts.join('\n') },
    ];

    let plan: ProjectPlan;
    try {
      const result = await generateObject({
        model: client(actualModel),
        schema: projectPlanSchema,
        messages,
      });
      plan = result.object as ProjectPlan;
    } catch (structuredError) {
      // Not every model honours a JSON schema. Fall back to plain text and parse
      // it ourselves rather than failing the whole planning step.
      console.warn(
        '[plan-project] Structured output failed, falling back to text parsing:',
        (structuredError as Error).message
      );

      const fallback = await generateText({
        model: client(actualModel),
        messages: [
          ...messages,
          {
            role: 'user' as const,
            content: 'Respond with ONLY the plan as a single JSON object. No prose, no code fences.',
          },
        ],
      });

      plan = parsePlanResponse(fallback.text);
    }

    console.log(
      `[plan-project] Planned ${plan.components.length} components, ${plan.sections.length} sections${feedback ? ' (revision)' : ''}`
    );

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('[plan-project] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
