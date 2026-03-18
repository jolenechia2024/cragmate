import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { GUEST_USER_ID } from "@/lib/utils";

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  userId: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = isSupabaseConfigured;

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Expose the current access token for the generated API client fetcher.
  useEffect(() => {
    (globalThis as any).__CRAGMATE_SUPABASE_ACCESS_TOKEN__ = session?.access_token ?? null;
  }, [session]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isConfigured) {
        if (mounted) setIsLoading(false);
        return;
      }

      const { data, error } = await supabase!.auth.getSession();
      if (error) console.warn("supabase.auth.getSession error", error);
      if (mounted) {
        setSession(data.session ?? null);
        setIsLoading(false);
      }
    }

    init();

    if (!isConfigured) return;

    const { data: sub } = supabase!.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [isConfigured]);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    const userId = user?.id ?? GUEST_USER_ID;

    const formatSupabaseAuthError = (
      e: any,
      mode: "login" | "signup",
    ): string => {
      const msg = e?.message ?? "Auth failed";
      const lower = String(msg).toLowerCase();
      const status = e?.status ?? e?.statusCode ?? e?.response?.status;

      // Supabase rate limits auth endpoints (429).
      // Window can be longer than a minute, so we tell the user to wait longer.
      if (
        status === 429 ||
        lower.includes("rate limit exceeded") ||
        lower.includes("too many requests")
      ) {
        return "Too many signup attempts. Please wait about 5 minutes and try again.";
      }

      // Supabase sometimes returns only "Invalid login credentials" for unconfirmed email.
      if (mode === "login") {
        if (lower.includes("invalid login credentials")) {
          return "Invalid email or password. If you just signed up, please check your email and confirm your account before logging in.";
        }
        if (lower.includes("not confirmed") || lower.includes("email not confirmed")) {
          return "Please confirm your email address before signing in.";
        }
      }

      if (mode === "signup") {
        if (lower.includes("already registered") && lower.includes("unconfirmed")) {
          return "An account already exists for this email, but it isn't confirmed yet. Please confirm your email to log in.";
        }
      }

      return msg;
    };

    return {
      isConfigured,
      isLoading,
      session,
      user,
      userId,
      signIn: async (email, password) => {
        if (!isConfigured) throw new Error("Auth not configured");
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(formatSupabaseAuthError(error, "login"));
        }
      },
      signUp: async (email, password) => {
        if (!isConfigured) throw new Error("Auth not configured");
        const envRedirect =
          (import.meta as any).env?.VITE_EMAIL_REDIRECT_TO ??
          (import.meta as any).env?.VITE_SITE_URL ??
          undefined;
        const emailRedirectToRaw =
          (typeof envRedirect === "string" && envRedirect.trim() !== "" ? envRedirect : undefined) ??
          (typeof window !== "undefined" ? window.location.origin : undefined);
        const emailRedirectTo = emailRedirectToRaw?.replace(/\/$/, "");

        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
          options: emailRedirectTo ? { emailRedirectTo } : undefined,
        });
        if (error) throw new Error(formatSupabaseAuthError(error, "signup"));

        const confirmedAt = (data?.user as any)?.confirmed_at as string | null | undefined;
        const hasSession = Boolean(data?.session);
        const needsEmailConfirmation = Boolean(data?.user) && !confirmedAt && !hasSession;
        return { needsEmailConfirmation };
      },
      signOut: async () => {
        if (!isConfigured) return;
        const { error } = await supabase!.auth.signOut();
        if (error) {
          throw new Error(formatSupabaseAuthError(error, "login"));
        }
      },
    };
  }, [isConfigured, isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

