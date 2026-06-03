import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { Card, Button, Dialog, Input, Label, Select, Textarea } from "@/components/ui";
import {
  useListSessions,
  useCreateSession,
  useListGyms,
  useDeleteSession,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useLocation } from "wouter";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Activity, Check, Trash2, Pencil, Flame } from "lucide-react";
import { getStreak, syncWeeklyStreakFromSessionDays } from "@/lib/streak";
import { SessionMonthHeatmapCalendar, SessionMonthHeatmapSkeleton } from "@/components/session-month-calendar";

const sessionSchema = z.object({
  gymId: z.coerce.number().min(1, "Please select a gym"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export default function SessionLogger() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { userId, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<{
    id: number;
    gymId: number;
    date: string;
    notes?: string;
  } | null>(null);
  const [isClimbPreviewOpen, setIsClimbPreviewOpen] = useState(false);
  const [isGuestGuideOpen, setIsGuestGuideOpen] = useState(false);
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
  const sampleSessions = useMemo(
    () => [
      {
        id: 0,
        gymId: 0,
        gymName: "Sample Gym",
        date: new Date().toISOString().split("T")[0],
        notes: "Preview only — sign in to save real sessions.",
        climbCount: 8,
        topGrade: "V3",
      },
    ],
    [],
  );
  const displayedSessions = isGuest ? sampleSessions : sessions;

  const sessionDaysKey = useMemo(
    () => displayedSessions.map((s) => String(s.date)).join("\0"),
    [displayedSessions],
  );
  const sessionDays = useMemo(
    () => (sessionDaysKey ? sessionDaysKey.split("\0") : []),
    [sessionDaysKey],
  );

  useEffect(() => {
    const onStreak = (e: Event) => {
      const weeks = (e as CustomEvent<{ weeks?: number }>).detail?.weeks;
      setStreak(typeof weeks === "number" ? weeks : getStreak().currentStreak);
    };
    window.addEventListener("cragmate:streak-updated", onStreak as EventListener);
    return () => window.removeEventListener("cragmate:streak-updated", onStreak as EventListener);
  }, []);

  useEffect(() => {
    if (user && isLoading) return;
    const next = syncWeeklyStreakFromSessionDays(sessionDays);
    setStreak(next.currentStreak);
    window.dispatchEvent(
      new CustomEvent("cragmate:streak-updated", { detail: { weeks: next.currentStreak } }),
    );
  }, [user, isLoading, sessionDays]);

  const deleteSessionMutation = useDeleteSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey({ userId }) });
      },
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: z.infer<typeof sessionSchema>;
    }) => {
      const token = (globalThis as { __CRAGMATE_SUPABASE_ACCESS_TOKEN__?: string })
        .__CRAGMATE_SUPABASE_ACCESS_TOKEN__;
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          gymId: data.gymId,
          date: data.date,
          notes: data.notes?.trim() ?? "",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to update session");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey({ userId }) });
      setEditingSession(null);
    },
  });

  const createMutation = useCreateSession({
    mutation: {
      onSuccess: (createdSession: { id?: number; date?: string } | undefined) => {
        const optimisticDays = createdSession?.date
          ? [...sessionDays, String(createdSession.date)]
          : sessionDays;
        const next = syncWeeklyStreakFromSessionDays(optimisticDays);
        setStreak(next.currentStreak);
        window.dispatchEvent(
          new CustomEvent("cragmate:streak-updated", { detail: { weeks: next.currentStreak } }),
        );
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey({ userId }) });
        setIsDialogOpen(false);
        reset();
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

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
  });

  useEffect(() => {
    if (!editingSession) return;
    resetEdit({
      gymId: editingSession.gymId,
      date: editingSession.date.includes("T")
        ? editingSession.date.split("T")[0]
        : editingSession.date,
      notes: editingSession.notes ?? "",
    });
  }, [editingSession, resetEdit]);

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
    createMutation.mutate({ data: { ...data, notes: userNotes, userId } });
  };

  function handleDeleteSession(sessionId: number, gymName: string) {
    if (
      !confirm(
        `Delete your session at ${gymName}? All climbs logged in this session will be removed.`,
      )
    ) {
      return;
    }
    deleteSessionMutation.mutate({ id: sessionId });
  }

  function promptLogin() {
    window.dispatchEvent(
      new CustomEvent("cragmate:open-auth", { detail: { mode: "login" as const } }),
    );
  }

  function openLogClimb(session: { id: number; gymName: string; date: string }) {
    if (isGuest) {
      setPreviewSessionName(session.gymName);
      setPreviewSessionDate(String(session.date));
      setIsClimbPreviewOpen(true);
      return;
    }
    setLocation(`/sessions/${session.id}?openClimb=1`);
  }

  function openEditSession(session: {
    id: number;
    gymId?: number;
    date: string;
    notes?: string;
  }) {
    if (isGuest) {
      promptLogin();
      return;
    }
    if (!session.gymId) return;
    setEditingSession({
      id: session.id,
      gymId: session.gymId,
      date: String(session.date),
      notes: session.notes,
    });
  }

  const onEditSubmit = (data: z.infer<typeof sessionSchema>) => {
    if (!editingSession) return;
    updateSessionMutation.mutate({ id: editingSession.id, data });
  };

  return (
    <Layout>
      <PageHeader
        title="Session Log"
        description="Track your ascents and measure progress."
        action={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2 w-full min-h-11 sm:min-h-12">
            <Plus className="w-5 h-5" /> Log Session
          </Button>
        }
      />

      <div className="mb-8 flex items-center gap-3 sm:gap-4 border-b border-primary/15 pb-6">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 shadow-[0_0_16px_rgba(0,212,170,0.12)]"
          aria-hidden
        >
          <Flame className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(0,212,170,0.55)]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-primary/75">Weekly streak</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl leading-tight tracking-wide tabular-nums">
            <span className="text-primary drop-shadow-[0_0_6px_rgba(0,212,170,0.35)]">{streak}</span>
            <span className="text-foreground/75"> week{streak === 1 ? "" : "s"}</span>
          </p>
        </div>
      </div>

      {isLoading ? (
        <>
          <SessionMonthHeatmapSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-card rounded-xl animate-pulse border border-card-border" />
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
              {displayedSessions.map((session) => (
                <Card
                  key={session.id}
                  className="h-full group hover:border-primary/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="p-6 flex flex-col h-full relative z-10">
                    <div className="flex items-start gap-2 mb-3">
                      <h3 className="flex-1 min-w-0 text-xl font-bold font-display uppercase tracking-wider group-hover:text-primary transition-colors leading-tight">
                        {session.gymName}
                      </h3>
                      <div className="flex items-center gap-0.5 shrink-0 -mt-0.5 -mr-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label="Edit session"
                          onClick={() => openEditSession(session)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label="Delete session"
                          disabled={!isGuest && deleteSessionMutation.isPending}
                          onClick={() => {
                            if (isGuest) {
                              promptLogin();
                              return;
                            }
                            handleDeleteSession(session.id, session.gymName);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <span className="inline-flex w-fit items-center gap-1.5 bg-teal-950/80 border border-teal-900/50 text-teal-300 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap mb-4">
                      <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      <time dateTime={String(session.date)}>{formatDate(String(session.date))}</time>
                    </span>

                    {session.notes ? (
                      <p className="text-muted-foreground text-sm mb-6 line-clamp-2 leading-relaxed">
                        {session.notes}
                      </p>
                    ) : null}

                    <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                          Total Climbs
                        </p>
                        <p className="text-2xl font-display">{session.climbCount}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                          Top Grade
                        </p>
                        <p className="text-2xl font-display text-primary drop-shadow-[0_0_5px_rgba(0,212,170,0.3)]">
                          {session.topGrade || "N/A"}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isGuest ? "outline" : "primary"}
                      className="w-full mt-4"
                      onClick={() => openLogClimb(session)}
                    >
                      Log Climb
                    </Button>
                  </div>
                </Card>
              ))}
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

      <Dialog
        open={editingSession !== null}
        onOpenChange={(open) => {
          if (!open) setEditingSession(null);
        }}
        title="Edit session"
      >
        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-6">
          <div>
            <Label>Gym</Label>
            <Select {...registerEdit("gymId")}>
              <option value="">Select a gym</option>
              {gyms?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            {editErrors.gymId && (
              <p className="text-destructive text-sm mt-1">{editErrors.gymId.message}</p>
            )}
          </div>

          <div>
            <Label>Date</Label>
            <Input type="date" {...registerEdit("date")} />
            {editErrors.date && (
              <p className="text-destructive text-sm mt-1">{editErrors.date.message}</p>
            )}
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Session notes..." {...registerEdit("notes")} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setEditingSession(null)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={updateSessionMutation.isPending}>
              {updateSessionMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
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
