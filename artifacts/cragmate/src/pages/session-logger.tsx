import { Layout } from "@/components/layout";
import { Card, Button, Dialog, Input, Label, Select, Textarea } from "@/components/ui";
import { useListSessions, useCreateSession, useListGyms, getListSessionsQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { Link } from "wouter";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Activity, Sparkles, Lightbulb, Check } from "lucide-react";
import { bumpClimbingStreak } from "@/lib/streak";

const sessionSchema = z.object({
  gymId: z.coerce.number().min(1, "Please select a gym"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export default function SessionLogger() {
  const queryClient = useQueryClient();
  const { userId, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClimbPreviewOpen, setIsClimbPreviewOpen] = useState(false);
  const [isGuestGuideOpen, setIsGuestGuideOpen] = useState(false);
  const [sessionTemplate, setSessionTemplate] = useState("custom");
  const [confidence, setConfidence] = useState("3");
  const [previewSessionName, setPreviewSessionName] = useState<string>("Sample Gym");
  const [previewSessionDate, setPreviewSessionDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Guest-only "log climb" preview state (not saved to the API).
  const [previewGradeSystem, setPreviewGradeSystem] = useState<"V-Scale" | "Font" | "Color">("V-Scale");
  const [previewGrade, setPreviewGrade] = useState<string>("V3");
  const [previewStyle, setPreviewStyle] = useState<string>("Vertical");
  const [previewAttempts, setPreviewAttempts] = useState<number>(1);
  const [previewSent, setPreviewSent] = useState<boolean>(true);
  const [previewNotes, setPreviewNotes] = useState<string>("Quiet feet, smooth pacing.");

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
    const onStreak = () => {
      // no-op; keeps pattern consistent if later you want more preview wiring
    };
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
      notes: "Example session card (login to save your real logs).",
      climbCount: 8,
      topGrade: "V3",
    },
  ];
  const displayedSessions = isGuest ? sampleSessions : sessions;
  
  const createMutation = useCreateSession({
    mutation: {
      onSuccess: () => {
        // Local-only streak (increments when you successfully log a session).
        bumpClimbingStreak();
        window.dispatchEvent(new CustomEvent("cragmate:streak-updated"));
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey({ userId }) });
        setIsDialogOpen(false);
        reset();
      }
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0]
    }
  });

  const SESSION_TEMPLATES: Record<string, string> = {
    custom: "",
    beginner:
      "Beginner template:\n- Warm-up: 10 mins easy movement\n- Goal: 6-10 climbs in VB-V2\n- Focus: quiet feet + balance\n- Cooldown: light stretch",
    endurance:
      "Endurance template:\n- Warm-up: 10 mins\n- 3 rounds of easier continuous climbing\n- Rest 2 mins between rounds\n- Notes: pacing + breathing",
    project:
      "Project template:\n- Warm-up + 2 easy benchmark climbs\n- Pick 1-2 project routes\n- 3-5 quality attempts per route\n- Record crux + beta changes",
  };

  const coachPrompt =
    confidence === "1" || confidence === "2"
      ? "Coach tip: If confidence is low today, drop 1 grade and focus on movement quality."
      : confidence === "5"
        ? "Coach tip: Confidence is high. Keep one hard challenge, but maintain good rest between tries."
        : "Coach tip: Aim for consistent pacing and clean footwork.";

  const onSubmit = (data: z.infer<typeof sessionSchema>) => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("cragmate:open-auth", {
          detail: { mode: "login" as const },
        }),
      );
      return;
    }

    const templateNotes = SESSION_TEMPLATES[sessionTemplate];
    const mergedNotes = [templateNotes, data.notes?.trim() ? `\nPersonal notes:\n${data.notes.trim()}` : "", `\nConfidence (1-5): ${confidence}`]
      .filter(Boolean)
      .join("\n");

    createMutation.mutate({ data: { ...data, notes: mergedNotes, userId } });
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-widest mb-2">Session Log</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Track your ascents and measure progress.</p>
        </div>
        <Button size="lg" onClick={() => setIsDialogOpen(true)} className="gap-2 w-full md:w-auto">
          <Plus className="w-5 h-5" /> Log Session
        </Button>
      </div>

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : displayedSessions.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-primary/20">
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
                </div>
              </Card>
            );

            return isGuest ? (
              <div key={session.id}>{CardEl}</div>
            ) : (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                {CardEl}
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Log New Session">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label>Session template</Label>
            <Select value={sessionTemplate} onChange={(e) => setSessionTemplate(e.target.value)}>
              <option value="custom">Custom</option>
              <option value="beginner">Beginner (first sessions)</option>
              <option value="endurance">Endurance</option>
              <option value="project">Project day</option>
            </Select>
            <div className="mt-2 text-xs text-muted-foreground whitespace-pre-line">
              {SESSION_TEMPLATES[sessionTemplate] || "Create your own structure."}
            </div>
          </div>

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
            <Textarea placeholder="How did you feel today?" {...register("notes")} />
          </div>

          <div>
            <Label>Confidence (1-5)</Label>
            <Select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              <option value="1">1 - Very low</option>
              <option value="2">2 - Low</option>
              <option value="3">3 - Neutral</option>
              <option value="4">4 - Good</option>
              <option value="5">5 - Great</option>
            </Select>
            <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{coachPrompt}</span>
            </div>
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
