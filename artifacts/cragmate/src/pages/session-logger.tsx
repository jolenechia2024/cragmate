import { Layout } from "@/components/layout";
import { Card, Button, Dialog, Input, Label, Select, Textarea } from "@/components/ui";
import { useListSessions, useCreateSession, useListGyms, getListSessionsQueryKey } from "@workspace/api-client-react";
import { cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Activity, Sparkles, Check, ChevronLeft, ChevronRight, Mountain } from "lucide-react";
import { bumpClimbingStreak, getStreak, weeklyStreakFromSessionDays } from "@/lib/streak";

const sessionSchema = z.object({
  gymId: z.coerce.number().min(1, "Please select a gym"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type SessionLikeCalendar = { date: unknown; climbCount?: number };

function normalizeCalendarDayKey(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw);
  const part = s.includes("T") ? s.split("T")[0]! : s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : null;
}

function formatYmd(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Monday-first weekday index */
function weekdayMondayFirst(d: Date): number {
  const w = d.getDay();
  return w === 0 ? 6 : w - 1;
}

/** Month grid: session dates show mountain + climb count; empty days show the date number only. */
function SessionMonthHeatmapCalendar({ sessions }: { sessions: SessionLikeCalendar[] }) {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const dayAgg = useMemo(() => {
    const map = new Map<string, { sessions: number; climbs: number }>();
    for (const s of sessions) {
      const key = normalizeCalendarDayKey(s.date);
      if (!key) continue;
      const prev = map.get(key) ?? { sessions: 0, climbs: 0 };
      prev.sessions += 1;
      prev.climbs += typeof s.climbCount === "number" ? s.climbCount : 0;
      map.set(key, prev);
    }
    return map;
  }, [sessions]);

  const y = cursor.getFullYear();
  const mon = cursor.getMonth();
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(cursor);
  const first = new Date(y, mon, 1);
  const lastDate = new Date(y, mon + 1, 0).getDate();
  const lead = weekdayMondayFirst(first);
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  const today = new Date();
  const todayY = today.getFullYear();
  const todayMon = today.getMonth();
  const todayDate = today.getDate();

  const summary = useMemo(() => {
    let sessionCount = 0;
    for (let d = 1; d <= lastDate; d++) {
      const key = formatYmd(y, mon, d);
      const a = dayAgg.get(key);
      if (!a || a.sessions === 0) continue;
      sessionCount += a.sessions;
    }
    return { sessionCount };
  }, [dayAgg, y, mon, lastDate]);

  const shiftMonth = (delta: number) => setCursor(new Date(y, mon + delta, 1));

  return (
    <Card className="mb-6 overflow-hidden border-primary/25 bg-gradient-to-b from-card via-card to-muted/35 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 pt-4 pb-2">
        <div>
          <p className="font-display text-lg sm:text-2xl tracking-wide capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9 px-3 text-[11px] uppercase tracking-wide" onClick={() => setCursor(new Date(todayY, todayMon, 1))}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Next month" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-x-1 sm:gap-x-2 px-3 pb-1 text-[10px] sm:text-[11px] text-center uppercase tracking-[0.12em] text-muted-foreground font-semibold">
        {weekdays.map((letter, ix) => (
          <span key={`${letter}-${ix}`} className="py-1">
            {letter}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-x-px gap-y-1 sm:gap-x-0.5 sm:gap-y-1.5 px-3 sm:px-4 pb-4 pt-0.5">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`pad-${i}`} className="h-10 sm:h-11" aria-hidden />
        ))}
        {Array.from({ length: lastDate }, (_, idx) => {
          const day = idx + 1;
          const key = formatYmd(y, mon, day);
          const cell = dayAgg.get(key);
          const hasSession = !!(cell && cell.sessions > 0);
          const climbs = cell?.climbs ?? 0;
          const visits = cell?.sessions ?? 0;
          const isTodayCell = todayY === y && todayMon === mon && todayDate === day;
          const tooltip = !hasSession ? undefined : `${visits} session${visits === 1 ? "" : "s"} · ${climbs} climb${climbs === 1 ? "" : "s"}`;
          const label = hasSession ? `Day ${day}. ${tooltip}` : `Day ${day}`;

          return (
            <div
              key={key}
              title={tooltip}
              aria-label={label}
              className="flex h-10 sm:h-11 w-full items-center justify-center"
            >
              {hasSession ? (
                <span
                  className={cn(
                    "inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full",
                    "border border-primary/55 bg-gradient-to-b from-primary/30 to-primary/12",
                    "shadow-[0_2px_12px_rgba(0,212,170,0.2)]",
                    isTodayCell && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background drop-shadow-[0_0_8px_rgba(0,212,170,0.45)]",
                  )}
                  aria-hidden
                >
                  <Mountain className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" strokeWidth={2.4} />
                </span>
              ) : (
                <span
                  className={cn(
                    "text-sm sm:text-[15px] font-medium tabular-nums",
                    isTodayCell ? "text-primary font-semibold" : "text-muted-foreground",
                  )}
                >
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-border/50 bg-muted/20 text-[11px] sm:text-xs text-muted-foreground">
        <strong className="text-foreground font-display tabular-nums text-base sm:text-lg">{summary.sessionCount}</strong>
        {" "}
        total sessions this month
      </div>
    </Card>
  );
}

function SessionMonthHeatmapSkeleton() {
  return (
    <Card className="mb-6 overflow-hidden border-primary/25 animate-pulse">
      <div className="h-16 px-4 flex items-center justify-between">
        <div className="h-6 w-40 rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-md bg-muted" />
          <div className="h-9 w-16 rounded-md bg-muted" />
          <div className="h-9 w-9 rounded-md bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 gap-x-px px-3 pb-6">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-10 sm:h-11 rounded-sm bg-muted/50" />
        ))}
      </div>
      <div className="h-12 border-t border-border bg-muted/30" />
    </Card>
  );
}

export default function SessionLogger() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { userId, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClimbPreviewOpen, setIsClimbPreviewOpen] = useState(false);
  const [isGuestGuideOpen, setIsGuestGuideOpen] = useState(false);
  const [showBeginnerSessionGuide, setShowBeginnerSessionGuide] = useState(false);
  const [previewSessionName, setPreviewSessionName] = useState<string>("Sample Gym");
  const [previewSessionDate, setPreviewSessionDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Guest-only "log climb" preview state (not saved to the API).
  const [previewGradeSystem, setPreviewGradeSystem] = useState<"V-Scale" | "Font" | "Color">("V-Scale");
  const [previewGrade, setPreviewGrade] = useState<string>("V3");
  const [previewStyle, setPreviewStyle] = useState<string>("Vertical");
  const [previewAttempts, setPreviewAttempts] = useState<number>(1);
  const [previewSent, setPreviewSent] = useState<boolean>(true);
  const [previewNotes, setPreviewNotes] = useState<string>("");
  const [streak, setStreak] = useState(() => getStreak().currentStreak);
  const [pendingSessionDayForStreak, setPendingSessionDayForStreak] = useState<string | null>(null);

  const [guestBestV, setGuestBestV] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      const raw = window.localStorage.getItem("cragmate_guest_best_v1");
      if (raw) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) setGuestBestV(parsed);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsGuestGuideOpen(false);
      return;
    }
    const seen = window.localStorage.getItem("cragmate_guest_climb_guide_seen_v1");
    if (seen !== "1") {
      setIsGuestGuideOpen(true);
      window.localStorage.setItem("cragmate_guest_climb_guide_seen_v1", "1");
    }
  }, [user]);

  useEffect(() => {
    const onStreak = () => setStreak(getStreak().currentStreak);
    window.addEventListener("cragmate:streak-updated", onStreak as EventListener);
    return () => window.removeEventListener("cragmate:streak-updated", onStreak as EventListener);
  }, []);

  function parseVScaleNumeric(grade: string): number | null {
    // Accept formats like V3, v10+, V0. Ignore V14+ -> 14 (still useful for "highest so far").
    const m = String(grade).trim().match(/^[Vv]\s*(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  const previewBestLabel = useMemo(() => {
    if (guestBestV <= 0) return "N/A";
    return `V${guestBestV}`;
  }, [guestBestV]);

  const { data: sessionsRaw, isLoading } = useListSessions(
    { userId },
    { query: { enabled: Boolean(user), queryKey: getListSessionsQueryKey({ userId }) } },
  );
  const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : [];
  const { data: gyms } = useListGyms();

  const isGuest = !user;
  const sampleSessions = [
    {
      id: 0,
      gymName: "Sample Gym",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      climbCount: 8,
      topGrade: "V3",
    },
  ];
  const displayedSessions = isGuest ? sampleSessions : sessions;

  /** Mon–Sun weeks: count consecutive backwards from this week where each week has ≥1 logged session date. */
  const weeklyStreakDerived = useMemo(() => {
    if (user && isLoading) return null;
    return weeklyStreakFromSessionDays(displayedSessions.map((s) => String(s.date)));
  }, [user, isLoading, displayedSessions]);

  const streakWeeksDisplayed = weeklyStreakDerived !== null ? weeklyStreakDerived : streak;

  const createMutation = useCreateSession({
    mutation: {
      onSuccess: (createdSession: { id?: number } | undefined) => {
        // Local-only streak based on submitted session date.
        bumpClimbingStreak(pendingSessionDayForStreak ?? undefined);
        window.dispatchEvent(new CustomEvent("cragmate:streak-updated"));
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey({ userId }) });
        setIsDialogOpen(false);
        reset();
        setPendingSessionDayForStreak(null);
        if (createdSession?.id) {
          setLocation(`/sessions/${createdSession.id}?openClimb=1`);
        }
      }
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = (data: z.infer<typeof sessionSchema>) => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("cragmate:open-auth", {
          detail: { mode: "login" as const },
        }),
      );
      return;
    }

    const userNotes = data.notes?.trim() ?? "";
    setPendingSessionDayForStreak(data.date);
    createMutation.mutate({ data: { ...data, notes: userNotes, userId } });
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-3 sm:gap-4">
        <div>
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-widest mb-2">Session Log</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track your ascents and measure progress.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 w-full md:w-auto min-h-11 sm:min-h-12">
          <Plus className="w-5 h-5" /> Log Session
        </Button>
      </div>

      <div className="mb-3">
        <button
          type="button"
          className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setShowBeginnerSessionGuide((v) => !v)}
        >
          {showBeginnerSessionGuide ? "Hide beginner session guide" : "Show beginner session guide"}
        </button>
      </div>
      {showBeginnerSessionGuide ? (
        <Card className="mb-6 p-4 border-primary/20 bg-card/60">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Beginner session guide</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try VB-V2 first, keep rests long, and track confidence to spot patterns over time.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="mb-6 p-4 border-primary/20 bg-card/60">
        <div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Weekly streak</p>
            <p className="font-display text-xl sm:text-2xl mt-1">
              {streakWeeksDisplayed} week{streakWeeksDisplayed === 1 ? "" : "s"}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Consecutive calendar weeks (Mon–Sun), each with at least one session date in your log — counted backward from today.
            </p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <>
          <SessionMonthHeatmapSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        </>
      ) : (
        <>
          <SessionMonthHeatmapCalendar sessions={displayedSessions} />
          {displayedSessions.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center border-dashed border-2 border-primary/20">
              <Activity className="w-16 h-16 text-primary mx-auto mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
              <h3 className="text-2xl font-display uppercase mb-2">
                {isGuest ? "Preview sessions" : "No sessions yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {isGuest ? "Fill the form, but sign in to save." : "Hit the crag and log your first session."}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>{isGuest ? "Try it" : "Start Logging"}</Button>
            </Card>
          ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedSessions.map((session) => {
            const CardEl = (
              <Card
                className="h-full hover:border-primary/80 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] relative overflow-hidden"
                onClick={() => {
                  if (isGuest) {
                    setPreviewSessionName(session.gymName);
                    setPreviewSessionDate(String(session.date));
                    setIsClimbPreviewOpen(true);
                  } else {
                    setLocation(`/sessions/${session.id}`);
                  }
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="p-6 flex flex-col h-full relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold font-display uppercase tracking-wider group-hover:text-primary transition-colors drop-shadow-sm">
                      {session.gymName}
                    </h3>
                    <span className="bg-teal-950 border border-teal-900/50 text-teal-300 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 shadow-sm">
                      <Calendar className="w-3 h-3" /> {formatDate(session.date)}
                    </span>
                  </div>

                  {session.notes && (
                    <p className="text-muted-foreground text-sm mb-6 line-clamp-2 italic">"{session.notes}"</p>
                  )}

                  <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Climbs</p>
                      <p className="text-2xl font-display">{session.climbCount}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Top Grade</p>
                      <p className="text-2xl font-display text-primary drop-shadow-[0_0_5px_rgba(0,212,170,0.3)]">
                        {session.topGrade || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant={isGuest ? "outline" : "primary"}
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isGuest) {
                          setPreviewSessionName(session.gymName);
                          setPreviewSessionDate(String(session.date));
                          setIsClimbPreviewOpen(true);
                          return;
                        }
                        setLocation(`/sessions/${session.id}?openClimb=1`);
                      }}
                    >
                      Log Climb
                    </Button>
                  </div>
                </div>
              </Card>
            );

            return <div key={session.id}>{CardEl}</div>;
          })}
        </div>
          )}
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Log New Session">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label>Gym</Label>
            <Select {...register("gymId")}>
              <option value="">Select a gym</option>
              {gyms?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
            {errors.gymId && <p className="text-destructive text-sm mt-1">{errors.gymId.message}</p>}
          </div>
          
          <div>
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
            {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
          </div>
          
          <div>
            <Label>Notes (Optional)</Label>
            <Textarea placeholder="Write your session notes..." {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : isGuest ? "Save (login required)" : "Create Session"}
          </Button>

          {isGuest ? (
            <p className="text-xs text-muted-foreground text-center">
              You can fill this in, but you must sign in to save.
            </p>
          ) : null}
        </form>
      </Dialog>

      <Dialog open={isGuestGuideOpen} onOpenChange={setIsGuestGuideOpen} title="How climb logging works">
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl uppercase tracking-wider leading-tight">
                Log a session, then log climbs
              </p>
              <p className="text-muted-foreground mt-2">
                In guest mode you can preview climb logging: choose grade system + grade, style, attempts, and sent/project status.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                setIsGuestGuideOpen(false);
                setIsClimbPreviewOpen(true);
              }}
            >
              Open climb preview
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsGuestGuideOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={isClimbPreviewOpen} onOpenChange={setIsClimbPreviewOpen} title={user ? "Log Climb (Preview)" : "Log Climb (Guest Preview)"}>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-widest">Session</p>
            <p className="font-display text-2xl mt-1">{previewSessionName}</p>
            <p className="text-muted-foreground mt-1">{previewSessionDate}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Grade System</Label>
              <Select value={previewGradeSystem} onChange={(e) => setPreviewGradeSystem(e.target.value as any)}>
                <option value="V-Scale">V-Scale</option>
                <option value="Font">Font</option>
                <option value="Color">Gym Color</option>
              </Select>
            </div>
            <div>
              <Label>Grade</Label>
              <Input value={previewGrade} onChange={(e) => setPreviewGrade(e.target.value)} placeholder="e.g. V4" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Style</Label>
              <Select value={previewStyle} onChange={(e) => setPreviewStyle(e.target.value)}>
                <option value="">Select style...</option>
                <option value="Slab">Slab</option>
                <option value="Overhang">Overhang</option>
                <option value="Vertical">Vertical</option>
                <option value="Dynamic">Dynamic/Coordination</option>
                <option value="Crimpy">Crimpy</option>
              </Select>
            </div>
            <div>
              <Label>Attempts</Label>
              <Input
                type="number"
                min={1}
                value={previewAttempts}
                onChange={(e) => setPreviewAttempts(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 cursor-pointer bg-card p-4 rounded-lg border border-border">
              <input
                type="checkbox"
                className="w-5 h-5 accent-primary"
                checked={previewSent}
                onChange={(e) => setPreviewSent(e.target.checked)}
              />
              <span className="text-base text-foreground">{previewSent ? "Did you send it?" : "Project (not sent yet)"}</span>
            </Label>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea value={previewNotes} onChange={(e) => setPreviewNotes(e.target.value)} placeholder="Beta, thoughts, crux..." />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Preview</p>
            <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Your grade</p>
                <p className="font-display text-3xl text-primary">{previewGrade || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Highest sent (preview)</p>
                <p className="font-display text-2xl">{previewSent ? previewBestLabel : "Send it to update"}</p>
              </div>
              <div className="flex items-center gap-2">
                <BadgePill tone={previewSent ? "success" : "warning"}>
                  {previewSent ? "Sent" : "Project"}
                </BadgePill>
                {previewStyle ? <BadgePill tone="neutral">{previewStyle}</BadgePill> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                if (!user && previewSent && previewGradeSystem === "V-Scale") {
                  const numeric = parseVScaleNumeric(previewGrade);
                  if (numeric != null && numeric > guestBestV) {
                    const next = numeric;
                    setGuestBestV(next);
                    window.localStorage.setItem("cragmate_guest_best_v1", String(next));
                  }
                }
              }}
              variant="primary"
            >
              {user ? "Save Climb (coming soon)" : "Update Preview"}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (!user) {
                  window.dispatchEvent(
                    new CustomEvent("cragmate:open-auth", {
                      detail: { mode: "login" as const },
                    }),
                  );
                }
                setIsClimbPreviewOpen(false);
              }}
            >
              {!user ? "Sign in to log now" : "Close"}
            </Button>
          </div>
        </div>
      </Dialog>
    </Layout>
  );
}

function BadgePill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "neutral";
  children: ReactNode;
}) {
  const cls =
    tone === "success"
      ? "bg-green-500/15 text-green-400 border-green-500/20"
      : tone === "warning"
        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/20"
        : "bg-card/60 text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${cls}`}>
      {children}
    </span>
  );
}
