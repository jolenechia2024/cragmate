import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import { generateClimbingText, isGeminiConfigured } from "../lib/gemini";

const router: IRouter = Router();

const beginnerHelpBody = z.object({
  question: z.string().min(3).max(500),
  holdType: z.string().optional(),
  topic: z.string().optional(),
});

function coachUnavailable(res: Response) {
  return res.status(503).json({
    error: "Coach is temporarily unavailable. Check server configuration.",
  });
}

function handleCoachError(res: Response, err: unknown) {
  console.error("[coach]", err);
  const status = (err as { status?: number }).status;
  const message = err instanceof Error ? err.message : "Request failed";

  if (
    status === 429 ||
    /429|Too Many Requests|quota exceeded|rate.?limit/i.test(message)
  ) {
    return res.status(429).json({
      error:
        "Rate limit reached. Wait about a minute and try again, or check quotas in Google AI Studio.",
    });
  }

  if (
    status === 503 ||
    /503|Service Unavailable|high demand/i.test(message)
  ) {
    return res.status(503).json({
      error:
        "The coach service is busy right now. Wait 30–60 seconds and try again.",
    });
  }

  if (
    status === 404 ||
    /not found|is not supported for generateContent/i.test(message)
  ) {
    return res.status(400).json({
      error: `Model "${process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"}" is not available. Set GEMINI_MODEL=gemini-2.5-flash in .env and restart the API.`,
    });
  }

  if (/API key|API_KEY|invalid/i.test(message)) {
    return res.status(401).json({
      error: "Invalid or missing API key. Check GEMINI_API_KEY in .env and restart the API server.",
    });
  }

  return res.status(500).json({
    error: "Coach is temporarily unavailable. Try again in a moment.",
  });
}

/** Beginner guide coach only — no other AI features use this route. */
router.post("/ai/beginner-help", async (req, res) => {
  if (!isGeminiConfigured()) return coachUnavailable(res);

  try {
    const parsed = beginnerHelpBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const { question, holdType, topic } = parsed.data;

    const contextParts = [
      "Context: User is a beginner indoor boulderer in Singapore.",
      holdType ? `They are asking about hold type: ${holdType}.` : null,
      topic ? `Topic area: ${topic}.` : null,
      "Key beginner tips you may reference: quiet feet, hips close to wall, rest 2-3 min between hard tries, land with bent knees, start easy (VB-V2), bring shoes/chalk/water.",
      "Hold types: jug (big rest hold), crimp (thin edge), sloper (round, needs body tension), pinch, pocket, sidepull, undercling, gaston, volume.",
    ].filter(Boolean);

    const prompt = `${contextParts.join("\n")}

User question: ${question}

Answer clearly for a first-timer in a few complete sentences (or 2–3 short bullets). If the question is about safety or pain, recommend rest and professional help.`;

    const text = await generateClimbingText(prompt);
    return res.json({ text });
  } catch (err) {
    return handleCoachError(res, err);
  }
});

export default router;
