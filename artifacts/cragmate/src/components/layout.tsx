import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Mountain, Activity, NotebookPen, MapPin, Users, Menu, X, LogIn, LogOut, User as UserIcon, Inbox as InboxIcon, Hand, ChevronRight, ChevronLeft, House, ArrowLeft, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { getStreak } from "@/lib/streak";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Dialog, Button, Input, Label } from "@/components/ui";
import { useAuth } from "@/auth/AuthProvider";

const NAV_ITEMS = [
  { href: "/sessions", label: "Sessions", icon: NotebookPen, requiresAuth: true },
  { href: "/progress", label: "Progress", icon: Activity, requiresAuth: false },
  { href: "/gyms", label: "Gyms", icon: MapPin },
  { href: "/grades", label: "Grade Converter", icon: Mountain },
  { href: "/partners", label: "Find a Partner", icon: Users },
  { href: "/inbox", label: "Inbox", icon: InboxIcon, requiresAuth: true },
];

function NavLink({ href, label, icon: Icon, onClick, disabled, compact = false, mobile = false }: any) {
  const [isActive] = useRoute(href);
  const className = cn(
    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg font-display tracking-wider transition-all duration-300 group overflow-hidden",
    mobile ? "text-sm" : "text-base sm:text-xl",
    compact && "justify-center px-2 py-3",
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
      <Icon className={cn("mb-0.5 relative z-10 transition-transform duration-300 group-hover:scale-110", mobile ? "w-4 h-4" : "w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]")} />
      {!compact && <span className="relative z-10">{label}</span>}
      {!compact && disabled ? (
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground relative z-10">
          Login
        </span>
      ) : null}
    </>
  );

  return disabled ? (
    <div className={className} title={disabled ? "Login required" : label}>
      {content}
    </div>
  ) : (
    <Link href={href} onClick={onClick} className={className} title={label}>
      {content}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, userId, isConfigured, isLoading: authLoading, signIn, signUp, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [contactPopupOpen, setContactPopupOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTopic, setContactTopic] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
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
  const [showHandCursor, setShowHandCursor] = useState(false);
  const [handCursorVisible, setHandCursorVisible] = useState(false);
  const handCursorX = useMotionValue(0);
  const handCursorY = useMotionValue(0);
  const [desktopSidebarHovered, setDesktopSidebarHovered] = useState(false);
  const [desktopSidebarPinnedOpen, setDesktopSidebarPinnedOpen] = useState(false);
  const isDesktopSidebarExpanded = desktopSidebarHovered || desktopSidebarPinnedOpen;
  const canNavigateBack = location !== "/" && typeof window !== "undefined" && window.history.length > 1;
  const navigateBack = () => {
    if (canNavigateBack) {
      window.history.back();
      return;
    }
    setLocation("/");
  };

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

  useEffect(() => {
    // Ensure every route navigation starts at top.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const sync = () => setShowHandCursor(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!showHandCursor) {
      setHandCursorVisible(false);
      return;
    }
    const onMove = (e: MouseEvent) => {
      if (!handCursorVisible) setHandCursorVisible(true);
      handCursorX.set(e.clientX);
      handCursorY.set(e.clientY);
    };
    const onLeave = () => setHandCursorVisible(false);
    const onEnter = () => setHandCursorVisible(true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
    };
  }, [showHandCursor, handCursorVisible, handCursorX, handCursorY]);

  return (
    <div className={cn("min-h-screen bg-background flex flex-col md:flex-row", showHandCursor && "md:cursor-none")}>
      {showHandCursor && (
        <motion.div
          className="fixed pointer-events-none z-[60]"
          style={{
            left: handCursorX,
            top: handCursorY,
            transform: "translate(-45%, -20%)",
          }}
          animate={{
            opacity: handCursorVisible ? 1 : 0,
            scale: handCursorVisible ? 1 : 0.92,
          }}
          transition={{ duration: 0.08, ease: "linear" }}
        >
          <Hand
            className="w-6 h-6 text-primary/95"
            style={{
              filter:
                "drop-shadow(0 0 2px rgba(0,212,170,0.9)) drop-shadow(0 0 8px rgba(0,212,170,0.55)) drop-shadow(0 0 16px rgba(0,212,170,0.32))",
            }}
          />
        </motion.div>
      )}
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between gap-3 px-4 py-2.5 bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {location !== "/" ? (
            <button
              type="button"
              className="w-8 h-8 rounded-md bg-background/60 text-foreground flex items-center justify-center"
              onClick={navigateBack}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 text-primary" />
            </button>
          ) : null}
          <Link href="/" className="flex items-center gap-2 text-primary">
          <Mountain className="w-5 h-5" />
          <span className="font-display text-lg tracking-widest mt-0.5">CRAGMATE</span>
          </Link>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Link
            href="/"
            className="w-8 h-8 rounded-md bg-background/60 text-foreground flex items-center justify-center"
            aria-label="Go home"
          >
            <House className="w-4 h-4 text-primary" />
          </Link>
          {user ? (
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-background/60 text-foreground flex items-center justify-center"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
              aria-label="Profile"
            >
              <span className="font-display text-[11px] text-primary">{initials}</span>
            </button>
          ) : (
            <button
              type="button"
              className="h-8 px-2.5 rounded-md bg-background/60 text-[11px] font-semibold uppercase tracking-wide text-foreground"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
                if (!isConfigured) {
                  setAuthError("Auth not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in artifacts/cragmate/.env then restart the web dev server.");
                }
              }}
            >
              Login
            </button>
          )}
          <button
            type="button"
            className="w-8 h-8 rounded-md bg-background/60 text-foreground flex items-center justify-center"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4 text-primary" />
          </button>
        </div>
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
              initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 top-0 mx-2 mt-2 max-h-[64vh] rounded-xl bg-card border border-border z-50 px-3 py-2.5 flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-primary drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]">
                  <Mountain className="w-5 h-5" />
                  <span className="font-display text-base tracking-widest mt-0.5">CRAGMATE</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    mobile
                    disabled={item.requiresAuth && !user}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex flex-col bg-card/95 border-r border-border sticky top-0 h-screen transition-[width,padding] duration-300",
          isDesktopSidebarExpanded ? "w-80 p-6" : "w-20 p-4",
        )}
        onMouseEnter={() => setDesktopSidebarHovered(true)}
        onMouseLeave={() => setDesktopSidebarHovered(false)}
      >
        <button
          type="button"
          onClick={() => setDesktopSidebarPinnedOpen((v) => !v)}
          aria-label={isDesktopSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-primary/30 bg-card text-primary/90 shadow-[0_0_10px_rgba(0,212,170,0.18)] flex items-center justify-center hover:bg-primary/10 transition-colors"
        >
          {isDesktopSidebarExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <Link
          href="/"
          className={cn(
            "flex items-center text-primary mb-10 hover:scale-105 transition-transform origin-left drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]",
            isDesktopSidebarExpanded ? "gap-3 justify-start" : "justify-center",
          )}
        >
          <Mountain className={cn("w-9 h-9", isDesktopSidebarExpanded && "w-10 h-10")} />
          {isDesktopSidebarExpanded && <span className="font-display text-4xl tracking-widest mt-1">CRAGMATE</span>}
        </Link>
        <div className={cn("flex flex-col gap-2 flex-1", !isDesktopSidebarExpanded && "items-center")}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} compact={!isDesktopSidebarExpanded} disabled={item.requiresAuth && !user} />
          ))}
        </div>
        <div className="mt-auto pt-6 border-t border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-display text-xl text-foreground group relative overflow-hidden">
              <span className="relative z-10">{initials}</span>
              <div className="absolute inset-0 bg-primary/20 scale-0 group-hover:scale-100 transition-transform rounded-full" />
            </div>
            {isDesktopSidebarExpanded && <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs uppercase tracking-wider text-primary/80">
                {user ? `Welcome, ${username}` : "Guest mode"}
              </p>
              {user ? (
                <p className="text-[11px] text-muted-foreground/90 truncate whitespace-nowrap mt-1">
                  Streak: {streak} week{streak === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>}
          </div>

          {isDesktopSidebarExpanded ? (
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
          ) : (
            <div className="mt-3 flex justify-center">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  if (user) signOut();
                  else {
                    setAuthMode("login");
                    setAuthOpen(true);
                  }
                }}
                title={user ? "Logout" : "Login"}
              >
                {user ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              </Button>
            </div>
          )}
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
        <div className="max-w-6xl mx-auto px-4 py-3 sm:p-6 md:p-8">
          {location !== "/" ? (
            <div className="hidden md:block mb-3 sm:mb-4">
              <button
                type="button"
                onClick={navigateBack}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/85 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          ) : null}
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
        <footer className="mt-8 sm:mt-10 bg-card/55">
          <div className="max-w-6xl mx-auto px-3 py-5 sm:p-6 md:p-8 sm:pt-11 border-t border-border/80">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 md:gap-10 text-left">
              <div className="w-full md:max-w-[20rem] md:justify-self-start">
                <p className="hidden sm:block text-primary font-semibold">Cragmate</p>
                <p className="hidden sm:block text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">
                  Your ultimate climbing companion.
                </p>
              </div>
              <div className="w-full md:max-w-[16rem] md:justify-self-center">
                <p className="text-xs sm:text-sm font-semibold text-foreground">Legal</p>
                <div className="mt-1.5 sm:mt-2 space-y-1 sm:space-y-1.5 text-xs sm:text-sm">
                  <Link href="/privacy" className="block text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="block text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </div>
              </div>
              <div className="w-full md:max-w-[16rem] md:justify-self-end">
                <p className="text-xs sm:text-sm font-semibold text-foreground">Resources</p>
                <div className="mt-1.5 sm:mt-2 space-y-1 sm:space-y-1.5 text-xs sm:text-sm">
                  <Link href="/gyms" className="block text-muted-foreground hover:text-foreground transition-colors">
                    Explore Gyms
                  </Link>
                  <Link href="/partners" className="block text-muted-foreground hover:text-foreground transition-colors">
                    Find a Partner
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setContactPopupOpen(true);
                      setContactSubmitted(false);
                    }}
                    className="block w-full text-left text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact Us
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-7 pt-3 sm:pt-4 border-t border-border/70 text-left md:text-center text-[11px] sm:text-xs text-muted-foreground">
              © 2026 Cragmate. All rights reserved.
            </div>
          </div>
        </footer>
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
      <Dialog open={contactPopupOpen} onOpenChange={setContactPopupOpen} title="Reach out to Cragmate">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setContactSubmitted(true);
          }}
        >
          <p className="text-sm text-muted-foreground">
            Want to collaborate, feedback, or say hi? Drop your details here.
          </p>
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Your email"
          />
          <Input
            value={contactTopic}
            onChange={(e) => setContactTopic(e.target.value)}
            placeholder="Topic (e.g. Collab, Sponsorship, Feedback)"
          />
          <textarea
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            placeholder="Message"
            rows={4}
            className="w-full rounded-md border border-primary/25 bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          {contactSubmitted ? (
            <p className="text-xs text-primary">Saved locally for now. We can connect this to your backend next.</p>
          ) : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setContactPopupOpen(false)}>
              Close
            </Button>
            <Button type="submit">Send</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
