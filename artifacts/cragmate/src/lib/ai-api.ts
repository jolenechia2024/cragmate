type CoachResponse = { text: string };

export type BeginnerCoachInput = {
  question: string;
  holdType?: string;
  topic?: string;
};

/** Cragmate AI Coach — beginner guide only. */
export async function askBeginnerCoach(body: BeginnerCoachInput): Promise<string> {
  const res = await fetch("/api/ai/beginner-help", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => null)) as { error?: string; text?: string } | null;

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }

  const text = (data as CoachResponse | null)?.text;
  if (!text) {
    throw new Error("No response received. Try again.");
  }

  return text;
}
