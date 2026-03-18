import type { NextFunction, Request, Response } from "express";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_KEY?.trim();

async function getUserIdFromAccessToken(accessToken: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase auth is not configured on the API server");
  }

  // Validate the access token against Supabase Auth.
  // This avoids trusting the client-provided userId for privacy.
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_KEY,
    },
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg =
      (data as any)?.message ??
      (data as any)?.error_description ??
      (data as any)?.error ??
      "Unauthorized";
    throw new Error(msg);
  }

  const userId = (data as any)?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId as string;
}

export default async function requireSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.slice("Bearer ".length);
    const userId = await getUserIdFromAccessToken(token);

    (req as any).authUserId = userId;
    return next();
  } catch (err) {
    return res.status(401).json({
      error: (err as any)?.message ?? "Unauthorized",
    });
  }
}

