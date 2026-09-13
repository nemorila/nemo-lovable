import { z } from 'zod';

// Shared between /api/plan-project, /api/generate-ai-code-stream,
// /api/apply-ai-code-stream and the editor client. The zod schema is the source
// of truth - it is what constrains the model's structured output.
export const projectPlanSchema = z.object({
  summary: z.string().describe("One or two sentences describing what will be built, in the user's language"),
  sections: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    })
  ).describe("Page sections in render order, named in the user's language"),
  components: z.array(
    z.object({
      name: z.string().describe('PascalCase ASCII identifier - becomes the filename'),
      path: z.string().describe('Full path, e.g. src/components/Header.jsx'),
      description: z.string().describe("What the component does, in the user's language"),
    })
  ),
  packages: z.array(z.string()).describe('npm package names to install, empty if none needed'),
  theme: z.object({
    colors: z.array(z.string()).describe('Hex colors, e.g. #0F172A'),
    typography: z.string(),
    mood: z.string(),
  }),
  // Optional: a clear request yields no questions, and a model may omit the
  // key entirely. Absent becomes [].
  questions: z.array(z.string()).default([]).describe("Open questions for the user, in the user's language"),
});

export type ProjectPlan = z.infer<typeof projectPlanSchema>;
export type PlannedComponent = ProjectPlan['components'][number];
