import { Layout } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { Link } from "wouter";
import { ArrowRight, Compass, Mountain, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState, useRef, type ReactNode, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { animate, motion, useMotionValue } from "framer-motion";

export default function Home() {
  const QUIZ_STORAGE_KEY = "cragmate_climber_quiz_v2";

  type ClimberType =
    | "Technician"
    | "Explorer"
    | "Strategist"
    | "Flow Climber"
    | "Motivator"
    | "Grinder"
    | "Risk-Taker"
    | "Calm Connector";

  type QuizState = {
    q1?: ClimberType;
    q2?: ClimberType;
    q3?: ClimberType;
    q4?: ClimberType;
    q5?: ClimberType;
    q6?: ClimberType;
  };

  const AXES = useMemo(
    () => [
      {
        key: "q1" as const,
        question: "You just walked into the gym. First move?",
        a: { value: "Technician" as const, label: "Quiet warm-up laps and tidy footwork" },
        b: { value: "Explorer" as const, label: "Tour the wall and try random cool problems" },
      },
      {
        key: "q2" as const,
        question: "Your project keeps spitting you off. You...",
        a: { value: "Strategist" as const, label: "Film beta, split it into chunks, make a plan" },
        b: { value: "Flow Climber" as const, label: "Shake out, breathe, and chase a cleaner rhythm" },
      },
      {
        key: "q3" as const,
        question: "Playlist and vibes check?",
        a: { value: "Motivator" as const, label: "Hype mode. Energy up, attempts up." },
        b: { value: "Calm Connector" as const, label: "Chill mode. Smooth breathing and flow." },
      },
      {
        key: "q4" as const,
        question: "Crux move above the last good hold?",
        a: { value: "Risk-Taker" as const, label: "Full commit. If I peel, I peel." },
        b: { value: "Grinder" as const, label: "Repeat setup until it feels automatic." },
      },
      {
        key: "q5" as const,
        question: "Best climbing day feels like...",
        a: { value: "Explorer" as const, label: "Tried 20 weird boulders and found new styles" },
        b: { value: "Strategist" as const, label: "Hit today’s target and can prove progress" },
      },
      {
        key: "q6" as const,
        question: "What do you write in notes after a send?",
        a: { value: "Technician" as const, label: "Heel timing, hip angle, exact foot swap" },
        b: { value: "Flow Climber" as const, label: "Felt snappy, calm, and in sync today" },
      },
    ],
    [],
  );

  const [quizStep, setQuizStep] = useState(0);
  const [quiz, setQuiz] = useState<QuizState>({});
  const [resultType, setResultType] = useState<ClimberType | null>(null);
  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0);

  const FEATURE_ITEMS = useMemo(
    () => [
      {
        title: "Track Progress",
        desc: "Log every attempt and watch your climbing trend level up over time.",
        Icon: TrendingUp,
      },
      {
        title: "Grade Converter",
        desc: "Translate grades across gyms quickly so sessions feel less confusing.",
        Icon: Mountain,
      },
      {
        title: "Find Partners",
        desc: "Post your session plans and connect with climbers at similar levels.",
        Icon: Users,
      },
    ],
    [],
  );

  useEffect(() => {
    // Persist quiz progress (including mid-quiz) so guests don't lose it on refresh.
    const payload = {
      quizStep,
      quiz,
      resultType,
    };
    try {
      window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore (private browsing, storage full, etc.)
    }
  }, [quizStep, quiz, resultType]);

  // Boulder rotation is now drag-controlled (no auto-rotation).

  const boulderRotation = useMotionValue(-10);
  const startPointerXRef = useRef<number | null>(null);
  const startPointerYRef = useRef<number | null>(null);
  const lastPointerXRef = useRef<number | null>(null);
  const lastPointerYRef = useRef<number | null>(null);
  const dragMovedForClickRef = useRef(false);
  const [isBoulderDragging, setIsBoulderDragging] = useState(false);
  const isBoulderDraggingRef = useRef(false);
  const boulderSnapControlsRef = useRef<ReturnType<typeof animate> | null>(null);

  const prevQuizResultTypeRef = useRef<ClimberType | null>(null);
  const [quizSurpriseNonce, setQuizSurpriseNonce] = useState(0);
  const [isFeatureBoulderInView, setIsFeatureBoulderInView] = useState(false);
  const [isQuizSurprisePending, setIsQuizSurprisePending] = useState(false);
  const [hasRevealedQuizSurprise, setHasRevealedQuizSurprise] = useState(false);
  const featureBoulderSectionRef = useRef<HTMLDivElement | null>(null);

  function getQuizSurpriseStyle(type: ClimberType): { glow: string; border: string; bg: string } {
    const map: Record<ClimberType, { glow: string; border: string; bg: string }> = {
      Technician: { glow: "rgba(168,85,247,0.55)", border: "rgba(192,132,252,1)", bg: "rgba(192,132,252,0.16)" },
      Explorer: { glow: "rgba(59,130,246,0.55)", border: "rgba(96,165,250,1)", bg: "rgba(96,165,250,0.16)" },
      Strategist: { glow: "rgba(245,158,11,0.55)", border: "rgba(251,191,36,1)", bg: "rgba(251,191,36,0.16)" },
      "Flow Climber": { glow: "rgba(16,185,129,0.55)", border: "rgba(52,211,153,1)", bg: "rgba(52,211,153,0.16)" },
      Motivator: { glow: "rgba(236,72,153,0.55)", border: "rgba(244,114,182,1)", bg: "rgba(244,114,182,0.16)" },
      Grinder: { glow: "rgba(249,115,22,0.55)", border: "rgba(251,146,60,1)", bg: "rgba(251,146,60,0.16)" },
      "Risk-Taker": { glow: "rgba(239,68,68,0.55)", border: "rgba(248,113,113,1)", bg: "rgba(248,113,113,0.16)" },
      "Calm Connector": { glow: "rgba(34,211,238,0.55)", border: "rgba(103,232,249,1)", bg: "rgba(103,232,249,0.16)" },
    };
    return map[type];
  }

  function getQuizSurpriseHoldConfig(type: ClimberType) {
    const order: ClimberType[] = [
      "Technician",
      "Explorer",
      "Strategist",
      "Flow Climber",
      "Motivator",
      "Grinder",
      "Risk-Taker",
      "Calm Connector",
    ];
    const i = order.indexOf(type);
    const posCandidates = [
      { left: "30%", top: "40%", rotate: "-14deg" },
      { left: "70%", top: "44%", rotate: "12deg" },
      { left: "52%", top: "26%", rotate: "-6deg" },
      { left: "24%", top: "62%", rotate: "14deg" },
      { left: "78%", top: "30%", rotate: "-10deg" },
      { left: "42%", top: "74%", rotate: "8deg" },
    ];
    const shapeCandidates = [
      "72% 28% 40% 60% / 58% 42% 70% 30%",
      "60% 40% 65% 35% / 35% 65% 45% 55%",
      "48% 52% 58% 42% / 62% 38% 45% 55%",
    ];
    const sizeCandidates = [
      { w: 70, h: 48 },
      { w: 64, h: 44 },
      { w: 78, h: 52 },
    ];

    const style = getQuizSurpriseStyle(type);
    const pos = posCandidates[i % posCandidates.length];
    const borderRadius = shapeCandidates[i % shapeCandidates.length];
    const { w, h } = sizeCandidates[i % sizeCandidates.length];

    return { ...style, pos, borderRadius, w, h };
  }

  const quizSurpriseHoldConfig = useMemo(() => {
    return resultType ? getQuizSurpriseHoldConfig(resultType) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultType]);

  useEffect(() => {
    // Mark surprise as pending when the quiz finishes.
    if (prevQuizResultTypeRef.current === null && resultType) {
      setIsQuizSurprisePending(true);
      setHasRevealedQuizSurprise(false);
    }
    // Reset when user retakes.
    if (resultType === null) {
      setIsQuizSurprisePending(false);
      setHasRevealedQuizSurprise(false);
    }
    prevQuizResultTypeRef.current = resultType;
  }, [resultType]);

  useEffect(() => {
    const el = featureBoulderSectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsFeatureBoulderInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.25 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // Only start the reveal animation once the section is scrolled into view.
    if (!isQuizSurprisePending) return;
    if (!isFeatureBoulderInView) return;
    if (hasRevealedQuizSurprise) return;

    setQuizSurpriseNonce((n) => n + 1);
    setHasRevealedQuizSurprise(true);
    setIsQuizSurprisePending(false);
  }, [hasRevealedQuizSurprise, isFeatureBoulderInView, isQuizSurprisePending]);

  function snapBoulderToFeature(nextIdx: number) {
    // Snap to the old “120deg per feature” dial positions, but pick the closest
    // angle to avoid long spins.
    const current = boulderRotation.get();
    const targetBase = nextIdx * 120;
    const candidates = [targetBase, targetBase + 360, targetBase - 360];
    const target = candidates.sort((a, b) => Math.abs(a - current) - Math.abs(b - current))[0] ?? targetBase;

    try {
      boulderSnapControlsRef.current?.stop?.();
    } catch {
      // ignore
    }

    boulderSnapControlsRef.current = animate(boulderRotation, target, {
      type: "tween",
      duration: 0.4,
      ease: "easeOut",
    });
  }

  function handleBoulderPointerDown(e: ReactPointerEvent<HTMLElement>) {
    startPointerXRef.current = e.clientX;
    startPointerYRef.current = e.clientY;
    dragMovedForClickRef.current = false;
    lastPointerXRef.current = e.clientX;
    lastPointerYRef.current = e.clientY;
    // If a snap animation is currently running (from a tap),
    // stop it so the drag immediately takes over.
    try {
      boulderSnapControlsRef.current?.stop?.();
    } catch {
      // ignore
    }
    setIsBoulderDragging(false);
    isBoulderDraggingRef.current = false;
  }

  function handleBoulderPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const startX = startPointerXRef.current;
    const startY = startPointerYRef.current;
    const lastX = lastPointerXRef.current;
    const lastY = lastPointerYRef.current;
    if (startX === null || startY === null || lastX === null || lastY === null) return;

    const dxTotal = e.clientX - startX;
    const dyTotal = e.clientY - startY;
    const dist = Math.hypot(dxTotal, dyTotal);

    // Only start rotating after a deliberate drag (fixes “hold not clickable”).
    const dragThreshold = e.pointerType === "touch" ? 18 : 10;
    const shouldDrag = dist > dragThreshold;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastPointerXRef.current = e.clientX;
    lastPointerYRef.current = e.clientY;

    if (!shouldDrag) return;

    if (!dragMovedForClickRef.current) dragMovedForClickRef.current = true;
    if (!isBoulderDraggingRef.current) {
      isBoulderDraggingRef.current = true;
      setIsBoulderDragging(true);
    }

    // Rotate freely (allow values to go beyond 360deg).
    boulderRotation.set(boulderRotation.get() + dx * 0.45 - dy * 0.08);
  }

  function handleBoulderPointerUp() {
    lastPointerXRef.current = null;
    lastPointerYRef.current = null;
    startPointerXRef.current = null;
    startPointerYRef.current = null;
    setIsBoulderDragging(false);
    isBoulderDraggingRef.current = false;
  }

  function computeType(nextQuiz: QuizState): ClimberType | "" {
    const values = [nextQuiz.q1, nextQuiz.q2, nextQuiz.q3, nextQuiz.q4, nextQuiz.q5, nextQuiz.q6];
    if (values.some((v) => !v)) return "";

    const score: Record<ClimberType, number> = {
      Technician: 0,
      Explorer: 0,
      Strategist: 0,
      "Flow Climber": 0,
      Motivator: 0,
      Grinder: 0,
      "Risk-Taker": 0,
      "Calm Connector": 0,
    };

    values.forEach((v) => {
      if (v) score[v] += 1;
    });

    const priority: ClimberType[] = [
      "Risk-Taker",
      "Calm Connector",
      "Motivator",
      "Grinder",
      "Strategist",
      "Flow Climber",
      "Technician",
      "Explorer",
    ];

    const best = Object.entries(score).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return priority.indexOf(a[0] as ClimberType) - priority.indexOf(b[0] as ClimberType);
    })[0]?.[0] as ClimberType | undefined;

    return best ?? "";
  }

  const nextAdvice = useMemo(() => {
    if (!resultType) return null;
    if (resultType === "Technician") {
      return {
        title: "You are The Technician",
        body: "You are all about details. Tiny foot placements, clean body positions, and smart repeats are your superpower.",
      };
    }
    if (resultType === "Explorer") {
      return {
        title: "You are The Explorer",
        body: "You get better by trying everything. Weird beta, new styles, random wall sections - that is your happy place.",
      };
    }
    if (resultType === "Strategist") {
      return {
        title: "You are The Strategist",
        body: "You love a game plan. Give yourself one target, track attempts, and you usually crack it before the session ends.",
      };
    }
    if (resultType === "Flow Climber") {
      return {
        title: "You are The Flow Climber",
        body: "You climb best when movement feels smooth, not forced. Rhythm, breathing, and timing matter more than brute effort.",
      };
    }
    if (resultType === "Motivator") {
      return {
        title: "You are The Motivator",
        body: "You run on energy. A bit of hype, friends cheering, and you suddenly stick moves that felt impossible 10 minutes ago.",
      };
    }
    if (resultType === "Grinder") {
      return {
        title: "You are The Grinder",
        body: "You trust the process. Same climb, cleaner tries, small upgrades each burn - and then it clicks.",
      };
    }
    if (resultType === "Risk-Taker") {
      return {
        title: "You are The Risk-Taker",
        body: "You are bold. You commit hard, go for big moves, and learn fastest when you stop hesitating.",
      };
    }
    return {
      title: "You are The Calm Connector",
      body: "You are steady and composed. You read routes well, stay relaxed under pressure, and make climbing look easy.",
    };
  }, [resultType]);

  const currentAxis = AXES[quizStep] ?? null;

  return (
    <Layout>
      <div className="relative rounded-2xl overflow-hidden mb-8 sm:mb-12 bg-teal-950 border border-teal-900/30 shadow-[0_0_40px_rgba(0,212,170,0.05)]">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-texture.png`} 
            alt="Rock texture" 
            className="w-full h-full object-cover opacity-15 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10 p-5 sm:p-8 md:p-16 lg:p-24 flex flex-col items-center sm:items-start text-center sm:text-left max-w-3xl">
          <Badge className="mb-6 border border-primary text-primary bg-primary/10 shadow-[0_0_10px_rgba(0,212,170,0.2)]">BETA ACCESS</Badge>
          <h1 className="text-6xl sm:text-6xl md:text-8xl font-display uppercase leading-[0.9] sm:leading-[0.85] text-white mb-4 sm:mb-6">
            Conquer <br/><span className="text-primary drop-shadow-[0_0_15px_rgba(0,212,170,0.4)]">The Crag</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-10 max-w-xl font-medium">
            The ultimate companion for climbers. Track your sessions, visualize your progress, find buddies, and convert grades with ease. 
          </p>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 sm:gap-4">
            <Link href="/sessions" className="w-full sm:w-auto">
              <Button className="gap-2 w-full sm:w-auto min-h-9 sm:min-h-10 px-4 sm:px-6 text-sm sm:text-base">
                Log Your Session <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/gyms" className="w-full sm:w-auto">
              <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-9 sm:min-h-10 px-4 sm:px-6 text-sm sm:text-base">
                Explore Gyms
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div ref={featureBoulderSectionRef}>
        <Card className="p-6 sm:p-8 border-none bg-transparent">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Feature Boulder</p>
          <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wider mt-2">
            Drag to rotate or tap a hold
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 sm:gap-8 items-center">
          <div className="flex flex-col items-center">
            <motion.div
              whileTap={{ cursor: "grabbing" }}
              onPointerDown={handleBoulderPointerDown}
              onPointerMove={handleBoulderPointerMove}
              onPointerUp={handleBoulderPointerUp}
              onPointerCancel={handleBoulderPointerUp}
              style={{ rotate: boulderRotation }}
              className={`relative overflow-hidden w-72 h-64 sm:w-80 sm:h-72 md:w-[28rem] md:h-[22rem] touch-none select-none ${isBoulderDragging ? "cursor-grabbing" : "cursor-grab"}`}
            >
              {/* Main irregular boulder body (Fountainebleau-ish silhouette) */}
              {/* Outer glowing outline (clipped to boulder silhouette) */}
              <motion.div
                className="absolute -inset-2 sm:-inset-4 bg-primary/25 blur-3xl opacity-70 pointer-events-none"
                style={{
                  clipPath:
                    "polygon(5% 24%, 16% 8%, 35% 10%, 49% 2%, 70% 8%, 86% 22%, 96% 44%, 88% 60%, 97% 76%, 80% 93%, 60% 86%, 43% 97%, 24% 87%, 8% 67%, 3% 43%)",
                }}
                animate={{
                  opacity: [0.45, 0.85, 0.55, 0.85, 0.45],
                  scale: [1, 1.03, 1.01, 1.04, 1],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div
                className="absolute inset-0 bg-gradient-to-br from-teal-300/30 via-teal-900/55 to-stone-950 shadow-[0_0_45px_rgba(0,212,170,0.28)]"
                style={{
                  clipPath:
                    "polygon(5% 24%, 16% 8%, 35% 10%, 49% 2%, 70% 8%, 86% 22%, 96% 44%, 88% 60%, 97% 76%, 80% 93%, 60% 86%, 43% 97%, 24% 87%, 8% 67%, 3% 43%)",
                  borderRadius: 0,
                  filter:
                    "drop-shadow(0 0 18px rgba(0,212,170,0.35)) drop-shadow(0 0 45px rgba(0,212,170,0.18))",
                }}
              />
              {/* Edge shading + knobbly cracks (clipped to the same silhouette) */}
              <div
                className="absolute inset-0 opacity-28 mix-blend-overlay pointer-events-none"
                style={{
                  clipPath:
                    "polygon(5% 24%, 16% 8%, 35% 10%, 49% 2%, 70% 8%, 86% 22%, 96% 44%, 88% 60%, 97% 76%, 80% 93%, 60% 86%, 43% 97%, 24% 87%, 8% 67%, 3% 43%)",
                  backgroundImage:
                    "linear-gradient(135deg, rgba(255,255,255,0.10), transparent 55%), linear-gradient(25deg, rgba(0,212,170,0.12), transparent 55%), radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14), transparent 40%), radial-gradient(circle at 80% 65%, rgba(0,0,0,0.20), transparent 48%)",
                }}
              />

              {/* Facets / surface planes (also made less circular via clipping) */}
              <div
                className="absolute left-[12%] top-[18%] w-[34%] h-[26%] bg-white/10 border border-white/10"
                style={{
                  clipPath:
                    "polygon(8% 18%, 25% 6%, 55% 10%, 70% 0%, 95% 20%, 90% 55%, 100% 86%, 65% 98%, 28% 92%, 0% 65%, 4% 35%)",
                }}
              />
              <div
                className="absolute right-[14%] top-[22%] w-[28%] h-[20%] bg-primary/20 border border-primary/25"
                style={{
                  clipPath:
                    "polygon(10% 0%, 55% 6%, 100% 28%, 90% 100%, 30% 92%, 0% 60%, 8% 30%)",
                }}
              />
              <div
                className="absolute right-[20%] bottom-[18%] w-[30%] h-[24%] bg-black/25 border border-border/40"
                style={{
                  clipPath:
                    "polygon(0% 35%, 12% 0%, 65% 6%, 100% 40%, 90% 100%, 25% 92%, 6% 70%)",
                }}
              />

              {/* Hold protrusions (real wall-style grips) */}
              {FEATURE_ITEMS.map((f, idx) => {
                const isActive = idx === activeFeatureIdx;
                // fixed positions so holds never overlap
                const pos =
                  idx === 0
                    ? { left: "20%", top: "32%", rotate: "-16deg" }
                    : idx === 1
                      ? { left: "82%", top: "22%", rotate: "14deg" }
                      : { left: "48%", top: "78%", rotate: "-8deg" };
                const ActiveIcon = f.Icon;

                return (
                  <button
                    key={f.title}
                    type="button"
                    onPointerDown={(e) => {
                      // Start the boulder rotation if the user drags from a hold.
                      e.stopPropagation();
                      handleBoulderPointerDown(e);
                    }}
                    onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                      // If the user dragged to rotate, don't also switch the feature.
                      if (dragMovedForClickRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        dragMovedForClickRef.current = false;
                        return;
                      }
                      setActiveFeatureIdx(idx);
                      snapBoulderToFeature(idx);
                    }}
                    aria-label={f.title}
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${isBoulderDragging ? "pointer-events-none" : ""}`}
                    style={{ left: pos.left, top: pos.top, transform: `translate(-50%, -50%) rotate(${pos.rotate})` }}
                  >
                    <span
                      className={`relative block border transition-all overflow-hidden ${
                        isActive
                          ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(0,212,170,0.45)]"
                          : "bg-card/70 border-border"
                      }`}
                      style={{
                        width: idx === 2 ? "78px" : idx === 0 ? "64px" : "60px",
                        height: idx === 2 ? "46px" : "42px",
                        borderRadius:
                          idx === 0
                              ? "72% 28% 40% 60% / 58% 42% 70% 30%"
                            : idx === 1
                                ? "55% 45% 65% 35% / 38% 62% 45% 55%"
                                : "45% 55% 35% 65% / 62% 38% 65% 35%",
                      }}
                    >
                      {isActive && (
                        <motion.span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-1 top-1 w-7 h-7 opacity-70 blur-[0.5px]"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 22%, rgba(0,212,170,0.0) 65%)",
                          }}
                          animate={{
                            opacity: [0.25, 1, 0.25],
                            scale: [0.9, 1.15, 0.95],
                            x: [-6, 10, -2],
                            y: [-4, 8, -2],
                          }}
                          transition={{
                            duration: 0.7,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                      {/* Varied grip shapes (matches the “mixed hold” look) */}
                      {idx === 0 && (
                        <>
                          <span
                              className="absolute -left-2 top-[22%] w-6 h-4 rounded-[85%_15%_55%_45%/40%_60%_35%_65%] border border-border/50 bg-primary/10"
                            style={{ transform: "rotate(-16deg)" }}
                          />
                          <span
                              className="absolute -right-2 top-[12%] w-5 h-3 rounded-[70%_30%_35%_65%/55%_45%_70%_30%] bg-black/18 border border-border/40"
                            style={{ transform: "rotate(10deg)" }}
                          />
                        </>
                      )}
                      {idx === 1 && (
                        <>
                          <span
                              className="absolute -left-1 top-[40%] w-4 h-3 rounded-[90%_10%_60%_40%/35%_65%_45%_55%] bg-primary/12 border border-border/40"
                            style={{ transform: "rotate(18deg)" }}
                          />
                          <span
                              className="absolute right-[-2px] top-[14%] w-7 h-4 rounded-[65%_35%_35%_65%/30%_70%_60%_40%] bg-black/14 border border-border/30"
                              style={{ transform: "rotate(-10deg)" }}
                          />
                        </>
                      )}
                      {idx === 2 && (
                        <>
                          <span
                              className="absolute -left-2 top-[12%] w-6 h-4 rounded-[80%_20%_45%_55%/55%_45%_35%_65%] bg-primary/12 border border-border/40"
                            style={{ transform: "rotate(-10deg)" }}
                          />
                          <span
                              className="absolute right-[-2px] bottom-[10%] w-6 h-3 rounded-[60%_40%_30%_70%/65%_35%_55%_45%] bg-black/14 border border-border/30"
                              style={{ transform: "rotate(16deg)" }}
                          />
                        </>
                      )}

                      <span className="flex items-center justify-center h-full w-full">
                        <ActiveIcon className="w-5 h-5" />
                      </span>
                    </span>
                    {/* little grip texture */}
                    <span
                      className="pointer-events-none absolute inset-0 rounded-[28px] opacity-40"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 55%), linear-gradient(135deg, rgba(0,212,170,0.18), rgba(2,6,23,0.25))",
                      }}
                    />
                  </button>
                );
              })}

              {/* Quiz surprise hold (extra, non-clickable) */}
              {resultType && quizSurpriseHoldConfig && (
                <span
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: quizSurpriseHoldConfig.pos.left,
                    top: quizSurpriseHoldConfig.pos.top,
                    transform: `translate(-50%, -50%) rotate(${quizSurpriseHoldConfig.pos.rotate})`,
                    width: `${quizSurpriseHoldConfig.w}px`,
                    height: `${quizSurpriseHoldConfig.h}px`,
                  }}
                >
                  <span
                    className="relative block border transition-all overflow-visible"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: quizSurpriseHoldConfig.borderRadius,
                      background: quizSurpriseHoldConfig.bg,
                      borderColor: quizSurpriseHoldConfig.border,
                      boxShadow: `0 0 0 1px ${quizSurpriseHoldConfig.border}, 0 0 30px ${quizSurpriseHoldConfig.glow}`,
                    }}
                  >
                    {/* Pocket / hole inside the surprise hold */}
                    {hasRevealedQuizSurprise ? (
                      <motion.span
                        key={`quiz-surprise-pocket-${quizSurpriseNonce}`}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-95"
                        style={{
                          width: "66%",
                          height: "66%",
                          borderRadius: "9999px",
                          background:
                            "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 22%, rgba(0,0,0,0.14) 48%, rgba(0,0,0,0.30) 78%, rgba(0,0,0,0.38) 100%)",
                          boxShadow:
                            "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -12px 22px rgba(0,0,0,0.22), inset 0 10px 16px rgba(0,212,170,0.06)",
                        }}
                        initial={{ scale: 1, filter: "brightness(1)" }}
                        animate={{
                          scale: [1, 0.9, 0.78, 0.9, 1],
                          filter: [
                            "brightness(1)",
                            "brightness(0.98)",
                            "brightness(0.92)",
                            "brightness(0.98)",
                            "brightness(1)",
                          ],
                        }}
                      transition={{ duration: 3.1, ease: "easeOut" }}
                      />
                    ) : (
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-95"
                        style={{
                          width: "66%",
                          height: "66%",
                          borderRadius: "9999px",
                          background:
                            "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 22%, rgba(0,0,0,0.14) 48%, rgba(0,0,0,0.30) 78%, rgba(0,0,0,0.38) 100%)",
                          boxShadow:
                            "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -12px 22px rgba(0,0,0,0.22), inset 0 10px 16px rgba(0,212,170,0.06)",
                        }}
                      />
                    )}

                    {/* One-shot pulse when quiz finishes */}
                    {hasRevealedQuizSurprise && (
                      <>
                        <motion.span
                          key={`quiz-surprise-pulse-${quizSurpriseNonce}`}
                          aria-hidden="true"
                          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full opacity-0 blur-[0.5px]"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.25) 22%, ${quizSurpriseHoldConfig.bg} 50%, rgba(0,0,0,0) 70%)`,
                          }}
                          initial={{ opacity: 0, scale: 0.75 }}
                          animate={{ opacity: [0, 1, 0], scale: [0.85, 1.2, 1.05] }}
                          transition={{ duration: 1.9, ease: "easeOut" }}
                        />

                        {/* “Drilling” reveal moment */}
                        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          {/* Drill bit */}
                          <motion.span
                            key={`quiz-surprise-drill-${quizSurpriseNonce}`}
                            aria-hidden="true"
                        className="absolute left-1/2 top-1/2 -translate-y-1/2 z-[999]"
                        style={{ width: 72, height: 40, background: "transparent" }}
                            initial={{ opacity: 0, scale: 0.88, rotate: -2 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          // No glide: appear/disappear from the hold contact point.
                          rotate: [-2, 0, 0, -1],
                          scale: [0.88, 1.04, 1.0, 0.96],
                        }}
                        transition={{ duration: 7.2, ease: "easeInOut" }}
                      >
                        {/* Drill (simplified handheld tool) */}
                        {/* Drill bit — thin pointed spike */}
                        <span
                          aria-hidden="true"
                          className="absolute"
                          style={{
                            left: 0,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 20,
                            height: 3,
                            background: "#111111",
                            clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)",
                            borderRadius: 0,
                          }}
                        />

                        {/* Body — chunky rounded rectangle */}
                        <span
                          aria-hidden="true"
                          className="absolute"
                          style={{
                            left: 18,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 36,
                            height: 14,
                            background: "#111111",
                            borderRadius: "6px 10px 10px 6px",
                          }}
                        />

                        {/* Handle — vertical grip */}
                        <span
                          aria-hidden="true"
                          className="absolute"
                          style={{
                            left: 38,
                            top: 10,
                            width: 14,
                            height: 34,
                            background: "#111111",
                            borderRadius: "0 0 8px 8px",
                            opacity: 0.9,
                          }}
                        />
                      </motion.span>

                          {/* Drilling dust (stacked layers: chunks, fine cloud, puff rings) */}

                          {/* Layer 1: Heavy chalk/concrete chunks (slow, fall/roll away) */}
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
                            const angle = (i / 12) * Math.PI - Math.PI * 0.1;
                            const speed = 0.7 + Math.random() * 0.5;
                            const dx = Math.cos(angle) * (20 + i * 4.5) * speed;
                            // Gravity pull down
                            const dy =
                              Math.sin(angle) * (10 + i * 3.2) * speed + (14 + i * 2.3);
                            const size = 3 + (i % 4);
                            return (
                              <motion.span
                                key={`dust-chunk-${quizSurpriseNonce}-${i}`}
                                aria-hidden="true"
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm"
                                style={{
                                  width: size,
                                  height: size * 0.7,
                                  background: `rgba(${220 + i * 3}, ${210 + i * 2}, ${195 + i * 2}, 0.75)`,
                                  opacity: 0,
                                }}
                                initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
                                animate={{
                                  x: dx,
                                  y: dy,
                                  opacity: [0, 0.85, 0.6, 0],
                                  rotate: [0, 30 * (i % 2 === 0 ? 1 : -1), 60],
                                }}
                                transition={{
                                  duration: 2.3 + i * 0.2,
                                  delay: 1.0 + i * 0.03,
                                  ease: "easeOut",
                                }}
                              />
                            );
                          })}

                          {/* Layer 2: Fine chalk dust cloud (wide spread, lingers) */}
                          {Array.from({ length: 28 }).map((_, i) => {
                            const angle = (i / 28) * Math.PI * 2;
                            const r = 10 + i * 1.8;
                            const dx = Math.cos(angle) * r * (0.9 + (i % 4) * 0.25);
                            const dy = Math.sin(angle) * r * 0.75 - 8;
                            const size = 1.5 + (i % 3) * 0.8;
                            return (
                              <motion.span
                                key={`dust-fine-${quizSurpriseNonce}-${i}`}
                                aria-hidden="true"
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                style={{
                                  width: size,
                                  height: size,
                                  background: "rgba(230, 225, 215, 0.60)",
                                  filter: "blur(0.5px)",
                                  opacity: 0,
                                }}
                                initial={{ x: 0, y: 0, opacity: 0 }}
                                animate={{
                                  x: [0, dx * 0.4, dx],
                                  y: [0, dy * 0.5 - 5, dy - 10],
                                  opacity: [0, 0.85, 0.5, 0],
                                }}
                                transition={{
                                  duration: 3.8 + (i % 4) * 0.45,
                                  delay: 0.95 + (i % 7) * 0.07,
                                  ease: "easeOut",
                                }}
                              />
                            );
                          })}

                          {/* Layer 3: Dust puff rings (billow outward at contact point) */}
                          {[0, 1, 2, 3].map((i) => (
                            <motion.span
                              key={`dust-ring-${quizSurpriseNonce}-${i}`}
                              aria-hidden="true"
                              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                              style={{
                                width: 12 + i * 10,
                                height: 12 + i * 10,
                                border: "1.5px solid rgba(220,215,200,0.30)",
                                background: "transparent",
                                opacity: 0,
                              }}
                              initial={{ scale: 0.3, opacity: 0 }}
                              animate={{
                                scale: [0.3, 1.4 + i * 0.4, 1.1],
                                opacity: [0, 0.5, 0],
                              }}
                              transition={{
                                duration: 1.8 + i * 0.45,
                                delay: 1.0 + i * 0.2,
                                ease: "easeOut",
                              }}
                            />
                          ))}
                        </span>
                      </>
                    )}
                  </span>
                </span>
              )}

              {[
                // Center-biased positions to avoid any “on outline” appearance.
                { left: "22%", top: "28%", w: "30px", h: "16px", r: "90% 10% 55% 45% / 35% 65% 28% 72%", rot: "-18deg", bg: "bg-primary/10" },
                { left: "46%", top: "18%", w: "30px", h: "16px", r: "88% 12% 60% 40% / 45% 55% 25% 75%", rot: "10deg", bg: "bg-black/14" },
                { left: "74%", top: "34%", w: "30px", h: "16px", r: "82% 18% 55% 45% / 40% 60% 35% 65%", rot: "16deg", bg: "bg-primary/10" },
                { left: "42%", top: "74%", w: "26px", h: "14px", r: "92% 8% 50% 50% / 40% 60% 30% 70%", rot: "-10deg", bg: "bg-black/14" },
              ].map((d, i) => (
                <span
                  key={i}
                  className={`absolute z-0 -translate-x-1/2 -translate-y-1/2 overflow-hidden ${d.bg} border border-border/30 opacity-75`}
                  style={{
                    left: d.left,
                    top: d.top,
                    width: d.w,
                    height: d.h,
                    borderRadius: d.r,
                    transform: `rotate(${d.rot}) translate(-50%, -50%)`,
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 8px 14px rgba(0,0,0,0.18)",
                  }}
                >
                  {/* Hold pocket / hole (recess) */}
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-95 pointer-events-none"
                    style={{
                      width: "72%",
                      height: "72%",
                      borderRadius: "9999px",
                      background:
                        "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 20%, rgba(0,0,0,0.16) 48%, rgba(0,0,0,0.38) 78%, rgba(0,0,0,0.48) 100%)",
                      boxShadow:
                        "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -12px 22px rgba(0,0,0,0.20), inset 0 10px 16px rgba(0,212,170,0.07)",
                    }}
                  />
                </span>
              ))}
            </motion.div>
          </div>

          <div
            className="relative overflow-hidden rounded-xl border border-primary/20 bg-background/40 p-5 sm:p-6"
            style={{
              // Keep glow contained to the card itself (no outside bleed).
              boxShadow:
                "inset 0 0 0 1px rgba(0,212,170,0.10), inset 0 0 28px rgba(0,212,170,0.12)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 25% 20%, rgba(0,212,170,0.22), transparent 55%), radial-gradient(circle at 70% 90%, rgba(14,165,233,0.10), transparent 60%)",
              }}
            />
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Now showing</p>
              <div className="relative">
                <h3 className="font-display text-xl sm:text-2xl uppercase tracking-wider mt-2">
                  {FEATURE_ITEMS[activeFeatureIdx]?.title}
                </h3>
                <div className="absolute left-0 right-0 -bottom-1 h-[2px] bg-primary/15 rounded-full overflow-hidden">
                  <motion.div
                    key={activeFeatureIdx}
                    className="h-full bg-primary/60 rounded-full origin-left"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-snug">
                {FEATURE_ITEMS[activeFeatureIdx]?.desc}
              </p>
            </div>
          </div>
        </div>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="p-6 sm:p-8 border-primary/20 bg-card/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Mini Quiz</p>
              <h2 className="font-display text-2xl sm:text-4xl uppercase tracking-wider mt-1 leading-tight">
                What type of climber are you?
              </h2>
              <p className="text-muted-foreground mt-3 leading-relaxed max-w-2xl">
                Quick vibe check: answer {AXES.length} fun questions and get your Cragmate climber type.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Progress</p>
              <p className="font-display text-3xl mt-1">
                {resultType ? "Done" : `${Math.min(quizStep + 1, AXES.length)}/${AXES.length}`}
              </p>
            </div>
          </div>

          {!resultType && currentAxis ? (
            <>
              <div className="mt-6 rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-widest">
                  Question {quizStep + 1} / {AXES.length}
                </p>
                <p className="font-display text-xl sm:text-2xl mt-2 leading-snug">{currentAxis.question}</p>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const value = currentAxis.a.value;
                      const nextQuiz = { ...quiz, [currentAxis.key]: value };
                      setQuiz(nextQuiz);
                      const computed = computeType(nextQuiz);
                      if (computed) {
                        setResultType(computed);
                        setQuizStep(AXES.length);
                        window.localStorage.setItem(
                          QUIZ_STORAGE_KEY,
                          JSON.stringify({ resultType: computed, quiz: nextQuiz }),
                        );
                      } else {
                        setQuizStep((s) => s + 1);
                      }
                    }}
                    className="justify-start text-left h-auto min-h-14 py-3 px-3 sm:px-4 text-sm leading-snug whitespace-normal break-words"
                  >
                    {currentAxis.a.label}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const value = currentAxis.b.value;
                      const nextQuiz = { ...quiz, [currentAxis.key]: value };
                      setQuiz(nextQuiz);
                      const computed = computeType(nextQuiz);
                      if (computed) {
                        setResultType(computed);
                        setQuizStep(AXES.length);
                        window.localStorage.setItem(
                          QUIZ_STORAGE_KEY,
                          JSON.stringify({ resultType: computed, quiz: nextQuiz }),
                        );
                      } else {
                        setQuizStep((s) => s + 1);
                      }
                    }}
                    className="justify-start text-left h-auto min-h-14 py-3 px-3 sm:px-4 text-sm leading-snug whitespace-normal break-words"
                  >
                    {currentAxis.b.label}
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Already know your vibe? You can retake anytime.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuizStep(0);
                    setQuiz({});
                    setResultType(null);
                    window.localStorage.removeItem(QUIZ_STORAGE_KEY);
                  }}
                >
                  Retake
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-background/40 p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Your result</p>
              <p className="font-display text-3xl sm:text-4xl mt-2 text-primary drop-shadow-[0_0_10px_rgba(0,212,170,0.15)] break-words">
                {resultType}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground mt-3">
                Check the boulder to see a surprise.
              </p>

              {nextAdvice ? (
                <>
                  <p className="font-semibold text-xl mt-3">{nextAdvice.title}</p>
                  <p className="text-muted-foreground mt-2 leading-relaxed">{nextAdvice.body}</p>
                </>
              ) : null}

              <div className="mt-5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuizStep(0);
                    setQuiz({});
                    setResultType(null);
                    window.localStorage.removeItem(QUIZ_STORAGE_KEY);
                  }}
                >
                  Retake Quiz
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-8 p-5 sm:p-6 border-primary/20 bg-card/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-display uppercase tracking-wider">First time climbing?</h3>
              <p className="text-muted-foreground mt-2">
                Click here for a beginner checklist + quick technique tips.
              </p>
            </div>
          </div>

          <Link href="/beginner" className="w-full sm:w-auto">
            <Button className="shrink-0 w-full sm:w-auto" size="lg">
              Click here <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </Card>
    </Layout>
  );
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold tracking-widest uppercase ${className}`}>
      {children}
    </span>
  );
}
