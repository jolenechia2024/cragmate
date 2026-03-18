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
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = isSupabaseConfigured;

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

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
              const details =
                (error as any)?.code ? ` (${(error as any).code})` : "";
              throw new Error(`${error.message}${details}`);
            }
      },
      signUp: async (email, password) => {
        if (!isConfigured) throw new Error("Auth not configured");
            const { error } = await supabase!.auth.signUp({ email, password });
            if (error) {
              const details =
                (error as any)?.code ? ` (${(error as any).code})` : "";
              throw new Error(`${error.message}${details}`);
            }
      },
      signOut: async () => {
        if (!isConfigured) return;
        const { error } = await supabase!.auth.signOut();
            if (error) {
              const details =
                (error as any)?.code ? ` (${(error as any).code})` : "";
              throw new Error(`${error.message}${details}`);
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

