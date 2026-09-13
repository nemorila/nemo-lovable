import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { getProviderForModel } from '@/lib/ai/provider-manager';
import { appConfig } from '@/config/app.config';
import type { SandboxState } from '@/types/sandbox';

export const dynamic = 'force-dynamic';

declare global {
  var sandboxState: SandboxState;
}

const CHAT_SYSTEM_PROMPT = `You are a helpful assistant embedded in a React app builder. The user is in CHAT MODE, not build mode.

ABSOLUTE RULES:
- You are having a conversation. You do NOT build anything and you do NOT edit any files.
- NEVER output <file> tags, <edit> tags, or any code that is meant to be applied to the project.
- Short illustrative snippets in markdown fences are fine when the user asks "how would I..." - but make it clear it is an explanation, not a change you are making.
- If the user asks you to actually build, change or fix something, tell them to switch to Build mode and they can send the same request there.

Answer in the same language the user writes in. Be concise and concrete. You can see the project's current files below - use them to answer accurately about the code that exists.`;

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      model = appConfig.ai.defaultModel,
      context,
    } = await request.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'prompt is required' },
        { status: 400 }
      );
    }

    const { client, actualModel } = getProviderForModel(model);

    // Give the model the current project so it can answer about real code.
    // Paths plus a truncated body keeps this cheap - chat mode does not need
    // the full file contents the build path sends.
    let fileContext = '';
    const files = global.sandboxState?.fileCache?.files;
    if (files && Object.keys(files).length > 0) {
      const entries = Object.entries(files).slice(0, 30);
      fileContext =
        `\n\n## Current project files\n` +
        entries
          .map(([path, file]) => {
            const body = file.content.slice(0, 2000);
            const truncated = file.content.length > 2000 ? '\n... (truncated)' : '';
            return `\n### ${path}\n\`\`\`\n${body}${truncated}\n\`\`\``;
          })
          .join('\n');
    }

    const recentMessages = Array.isArray(context?.recentMessages)
      ? context.recentMessages
          .slice(-10)
          .filter((m: any) => m?.content && (m.type === 'user' || m.type === 'ai'))
          .map((m: any) => ({
            role: m.type === 'user' ? ('user' as const) : ('assistant' as const),
            content: String(m.content).slice(0, 2000),
          }))
      : [];

    const result = await streamText({
      model: client(actualModel),
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT + fileContext },
        ...recentMessages,
        { role: 'user', content: prompt },
      ],
      maxOutputTokens: 4000,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text', text: chunk })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: (error as Error).message })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[chat] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
