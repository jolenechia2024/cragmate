import { GoogleGenerativeAI } from "@google/generative-ai";

/** Free-tier friendly; see https://ai.google.dev/gemini-api/docs/models */
const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it to your .env file and restart the API server.",
    );
  }
  return key;
}

function getPrimaryModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

const SAFETY_PREFIX = `You are CragMate, a friendly climbing companion for Singapore indoor climbers.
Rules:
- Give practical, encouraging advice. Keep responses brief (about 3–6 sentences). Always end with a complete sentence.
- Never claim medical authority. For pain or injury, suggest rest and seeing a professional.
- Do not invent session data; only use facts provided in the prompt.
- Use plain language; avoid jargon unless explaining it.
`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(err: unknown): number | undefined {
  return (err as { status?: number }).status;
}

function isRetryableGeminiError(err: unknown): boolean {
  const status = getErrorStatus(err);
  if (status === 429 || status === 503) return true;
  const message = err instanceof Error ? err.message : "";
  return /high demand|Service Unavailable|503|429|quota|rate.?limit/i.test(message);
}

async function generateWithModel(
  modelName: string,
  userPrompt: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      // High enough to avoid mid-sentence cuts; brevity comes from the prompt, not a low cap.
      maxOutputTokens: 1024,
      // 2.5 Flash uses "thinking" tokens that can eat the budget and truncate visible text.
      ...(modelName.includes("2.5")
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : {}),
    } as Record<string, unknown>,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: SAFETY_PREFIX + "\n\n" + userPrompt }] }],
  });

  const text = result.response.text()?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}

export async function generateClimbingText(userPrompt: string): Promise<string> {
  const primary = getPrimaryModelName();
  const modelsToTry = [
    primary,
    ...(primary !== FALLBACK_MODEL ? [FALLBACK_MODEL] : []),
  ];

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await generateWithModel(modelName, userPrompt);
      } catch (err) {
        lastError = err;
        if (!isRetryableGeminiError(err)) {
          throw err;
        }
        if (attempt === 0) {
          await sleep(1500);
          continue;
        }
      }
    }
  }

  throw lastError;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
