import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Mountain, Activity, NotebookPen, MapPin, Users, Menu, X, LogIn, LogOut, User as UserIcon, Inbox as InboxIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getStreak } from "@/lib/streak";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, Button, Input, Label } from "@/components/ui";
import { useAuth } from "@/auth/AuthProvider";

const NAV_ITEMS = [
  { href: "/sessions", label: "Sessions", icon: NotebookPen, requiresAuth: true },
  { href: "/progress", label: "Progress", icon: Activity, requiresAuth: false },
  { href: "/grades", label: "Grade Converter", icon: Mountain },
  { href: "/gyms", label: "Gyms", icon: MapPin },
  { href: "/partners", label: "Partners", icon: Users },
  { href: "/inbox", label: "Inbox", icon: InboxIcon, requiresAuth: true },
];

function NavLink({ href, label, icon: Icon, onClick, disabled }: any) {
  const [isActive] = useRoute(href);
  const className = cn(
    "relative flex items-center gap-3 px-4 py-3 rounded-lg font-display text-lg sm:text-xl tracking-wider transition-all duration-300 group overflow-hidden",
    disabled
      ? "opacity-50 cursor-not-allowed bg-transparent text-muted-foreground"
      : isActive
        ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,212,170,0.1)]"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

  const content = (
    <>
      {isActive && (
        <motion.div 
          layoutId="activeNavIndicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(0,212,170,0.8)]" 
        />
      )}
      {!isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 -translate-x-full group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
      )}
      <Icon className={cn("w-5 h-5 mb-0.5 relative z-10 transition-transform duration-300 group-hover:scale-110", isActive && "drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]")} />
      <span className="relative z-10">{label}</span>
      {disabled ? (
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground relative z-10">
          Login
        </span>
      ) : null}
    </>
  );

  return disabled ? (
    <div className={className} title="Login required">
      {content}
    </div>
  ) : (
    <Link href={href} onClick={onClick} className={className}>
      {content}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, userId, isConfigured, isLoading: authLoading, signIn, signUp, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authCooldownUntil, setAuthCooldownUntil] = useState<number | null>(null);
  const isAuthCooldownActive =
    authCooldownUntil != null && Date.now() < authCooldownUntil;
  const authCooldownSecondsRemaining = isAuthCooldownActive
    ? Math.ceil((authCooldownUntil! - Date.now()) / 1000)
    : 0;

  const displayName = authLoading
    ? "Loading…"
    : user?.email ?? (userId === "guest-user" ? "Guest User" : userId);
  const initials = (user?.email?.slice(0, 2) ?? "GU").toUpperCase();
  const username = user?.email ? user.email.split("@")[0] : "";

  const [streak, setStreak] = useState(() => getStreak().currentStreak);

  const submitAuth = async () => {
    const now = Date.now();
    if (authCooldownUntil != null && now < authCooldownUntil) {
      const seconds = Math.ceil((authCooldownUntil - now) / 1000);
      setAuthError(`Too many requests. Please wait ${seconds}s and try again.`);
      return;
    }

    setAuthError(null);
    setAuthBusy(true);
    try {
      if (authMode === "login") {
        await signIn(email, password);
        setAuthOpen(false);
        setEmail("");
        setPassword("");
      } else {
        const result = await signUp(email, password);
        if (result.needsEmailConfirmation) {
          setAuthMode("login");
          const name = email.trim().split("@")[0] || "climber";
          setAuthError(
            `Welcome, ${name}! Please check your email and confirm your address before logging in.`,
          );
          setPassword("");
          return;
        }

        setAuthOpen(false);
        setEmail("");
        setPassword("");
      }
    } catch (e: any) {
      const msg = e?.message ?? "Auth failed";
      setAuthError(msg);

      const lower = String(msg).toLowerCase();
      if (
        lower.includes("too many signup attempts") ||
        lower.includes("too many requests") ||
        lower.includes("rate limit") ||
        lower.includes("429")
      ) {
        setAuthCooldownUntil(Date.now() + 3_600_000);
      } else {
        setAuthCooldownUntil(null);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  // Allow pages to trigger the auth modal (used for "save requires login").
  useEffect(() => {
    function onOpenAuth(e: Event) {
      const ce = e as CustomEvent<{ mode?: "login" | "signup" }>;
      const mode = ce.detail?.mode;
      if (mode) setAuthMode(mode);
      setAuthOpen(true);
    }

    window.addEventListener("cragmate:open-auth", onOpenAuth as EventListener);
    return () => window.removeEventListener("cragmate:open-auth", onOpenAuth as EventListener);
  }, []);

  useEffect(() => {
    const onStreak = () => setStreak(getStreak().currentStreak);
    window.addEventListener("cragmate:streak-updated", onStreak as EventListener);
    return () =>
      window.removeEventListener("cragmate:streak-updated", onStreak as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3 bg-card border-b border-border sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Mountain className="w-6 h-6" />
          <span className="font-display text-xl tracking-widest mt-0.5">CRAGMATE</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="text-foreground p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 md:hidden backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border z-50 p-4 flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-primary drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]">
                  <Mountain className="w-8 h-8" />
                  <span className="font-display text-2xl tracking-widest mt-1">CRAGMATE</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-muted-foreground">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    disabled={item.requiresAuth && !user}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>

              {/* Mobile Auth / User */}
              <div className="mt-auto pt-6 border-t border-border">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-display text-xl text-foreground group relative overflow-hidden">
                    <span className="relative z-10">{initials}</span>
                    <div className="absolute inset-0 bg-primary/20 scale-0 group-hover:scale-100 transition-transform rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{displayName}</p>
                    <p className="text-[11px] uppercase tracking-wider text-primary/80">
                      {user ? `Welcome, ${username}` : "Guest mode"}
                    </p>
                    {user ? (
                      <p className="text-[11px] text-muted-foreground/90 truncate whitespace-nowrap">
                        Streak: {streak} day{streak === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex gap-2 flex-nowrap">
                  {!user ? (
                    <Button
                      variant="outline"
                      className="flex-1 whitespace-nowrap px-2"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthOpen(true);
                        setMobileOpen(false);
                        if (!isConfigured) {
                          setAuthError(
                            "Auth not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in artifacts/cragmate/.env then restart the web dev server.",
                          );
                        }
                      }}
                    >
                      <LogIn className="w-4 h-4 mr-1 shrink-0" />
                      <span className="text-sm">Login</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex-1 whitespace-nowrap px-2"
                      onClick={() => {
                        signOut();
                        setMobileOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-1 shrink-0" />
                      <span className="text-sm">Logout</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="flex-1 whitespace-nowrap px-2"
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthOpen(true);
                      setMobileOpen(false);
                      if (!isConfigured) {
                        setAuthError(
                          "Auth not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in artifacts/cragmate/.env then restart the web dev server.",
                        );
                      }
                    }}
                    disabled={Boolean(user)}
                  >
                    <UserIcon className="w-4 h-4 mr-1 shrink-0" />
                    <span className="text-sm">Sign Up</span>
                  </Button>
                </div>

                {!isConfigured && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Enable auth by adding{" "}
                    <span className="font-mono">VITE_SUPABASE_URL</span> and{" "}
                    <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to{" "}
                    <span className="font-mono">artifacts/cragmate/.env</span>, then restart Vite.
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-80 bg-card border-r border-border sticky top-0 h-screen p-6">
        <Link href="/" className="flex items-center gap-3 text-primary mb-12 hover:scale-105 transition-transform origin-left drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]">
          <Mountain className="w-10 h-10" />
          <span className="font-display text-4xl tracking-widest mt-1">CRAGMATE</span>
        </Link>
        <div className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} disabled={item.requiresAuth && !user} />
          ))}
        </div>
        <div className="mt-auto pt-6 border-t border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-display text-xl text-foreground group relative overflow-hidden">
              <span className="relative z-10">{initials}</span>
              <div className="absolute inset-0 bg-primary/20 scale-0 group-hover:scale-100 transition-transform rounded-full" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs uppercase tracking-wider text-primary/80">
                {user ? `Welcome, ${username}` : "Guest mode"}
              </p>
              {user ? (
                <p className="text-[11px] text-muted-foreground/90 truncate whitespace-nowrap mt-1">
                  Streak: {streak} day{streak === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2 flex-nowrap">
            {!user ? (
              <Button
                variant="outline"
                className="flex-1 whitespace-nowrap px-3"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                  if (!isConfigured) {
                    setAuthError("Auth not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in artifacts/cragmate/.env then restart the web dev server.");
                  }
                }}
              >
                <LogIn className="w-4 h-4 mr-2 shrink-0" />
                <span className="text-sm">Login</span>
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 whitespace-nowrap px-3" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2 shrink-0" />
                <span className="text-sm">Logout</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 whitespace-nowrap px-3"
              onClick={() => {
                setAuthMode("signup");
                setAuthOpen(true);
                if (!isConfigured) {
                  setAuthError("Auth not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in artifacts/cragmate/.env then restart the web dev server.");
                }
              }}
              disabled={Boolean(user)}
            >
              <UserIcon className="w-4 h-4 mr-2 shrink-0" />
              <span className="text-sm">Sign Up</span>
            </Button>
          </div>
          {!isConfigured && (
            <p className="mt-3 text-xs text-muted-foreground">
              Enable auth by adding <span className="font-mono">VITE_SUPABASE_URL</span> and{" "}
              <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to{" "}
              <span className="font-mono">artifacts/cragmate/.env</span>, then restart Vite.
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden relative">
        <div className="max-w-6xl mx-auto p-3 sm:p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Dialog open={authOpen} onOpenChange={setAuthOpen} title={authMode === "login" ? "Login" : "Sign up"}>
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
          </div>
          {authError && <p className="text-sm text-destructive">{authError}</p>}
          <Button
            className="w-full"
            onClick={submitAuth}
            disabled={authBusy || isAuthCooldownActive || !email || !password || !isConfigured}
          >
            {authMode === "login" ? "Login" : "Create account"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-muted-foreground underline underline-offset-4"
            onClick={() => setAuthMode((m) => (m === "login" ? "signup" : "login"))}
          >
            {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
