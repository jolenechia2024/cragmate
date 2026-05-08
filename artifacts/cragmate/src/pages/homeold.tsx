import { Layout } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { CLIMB_BOOSTS } from "@/lib/climb-boosts";
import { QUESTION_BANK } from "@/lib/quiz-bank";
import { Link } from "wouter";
import { ArrowRight, Compass, Mountain, TrendingUp, Users } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

export default function Home() {
const QUIZ_STORAGE_KEY = "cragmate_climber_quiz_v4";
const QUIZ_LENGTH = 10;

function shuffleAndPickN(total: number, n: number): number[] {
  const arr = Array.from({ length: total }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, n);
}
const FOLLOW_UP_BOOST = "Uh..what are you waiting for? Go hit the wall now.";

  type ClimberType = import("@/lib/quiz-bank").ClimberType;

  type QuizState = Record<string, ClimberType>;

  const QUIZ_QUESTION_BANK = QUESTION_BANK;

  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return shuffleAndPickN(QUIZ_QUESTION_BANK.length, QUIZ_LENGTH);
      const parsed = JSON.parse(raw) as { selectedQuestionIndices?: number[] };
      const idx = parsed.selectedQuestionIndices;
      if (Array.isArray(idx) && idx.length === QUIZ_LENGTH && idx.every((n) => typeof n === "number" && n >= 0 && n < QUIZ_QUESTION_BANK.length)) {
        return idx;
      }
    } catch {
      // ignore
    }
    return shuffleAndPickN(QUIZ_QUESTION_BANK.length, QUIZ_LENGTH);
  });
  const AXES = useMemo(
    () =>
      selectedQuestionIndices.map((idx, i) => {
        const q = QUIZ_QUESTION_BANK[idx];
        if (!q) return { key: `q${i}` as const, question: "", a: { value: "Technician" as ClimberType, label: "" }, b: { value: "Technician" as ClimberType, label: "" } };
        return {
          key: `q${i}` as const,
          question: q.question,
          a: { value: q.a, label: q.aL },
          b: { value: q.b, label: q.bL },
        };
      }),
    [selectedQuestionIndices],
  );

  const [quizStep, setQuizStep] = useState(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return 0;
      const p = JSON.parse(raw) as { quizStep?: number };
      return typeof p.quizStep === "number" ? p.quizStep : 0;
    } catch {
      return 0;
    }
  });
  const [quiz, setQuiz] = useState<QuizState>(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return {};
      const p = JSON.parse(raw) as { quiz?: QuizState };
      return p.quiz && typeof p.quiz === "object" ? p.quiz : {};
    } catch {
      return {};
    }
  });
  const [resultType, setResultType] = useState<ClimberType | null>(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw) as { resultType?: string };
      const valid: ClimberType[] = ["Technician", "Explorer", "Strategist", "Flow Climber", "Motivator", "Grinder", "Risk-Taker", "Calm Connector"];
      return valid.includes(p.resultType as ClimberType) ? (p.resultType as ClimberType) : null;
    } catch {
      return null;
    }
  });
  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0);
  // Boulder rotation is drag-controlled in 3D (no auto-rotation).
  const boulderRotateX = useMotionValue(8);
  const boulderRotateY = useMotionValue(-12);
  const startPointerXRef = useRef<number | null>(null);
  const startPointerYRef = useRef<number | null>(null);
  const lastPointerXRef = useRef<number | null>(null);
  const lastPointerYRef = useRef<number | null>(null);
  const dragMovedForClickRef = useRef(false);
  const [isBoulderDragging, setIsBoulderDragging] = useState(false);
  const isBoulderDraggingRef = useRef(false);
  const [surpriseTapPulseNonce, setSurpriseTapPulseNonce] = useState(0);
  const [activeHoldFace, setActiveHoldFace] = useState<"front" | "right" | "back" | "left">("front");
  const rightFaceOpacity = useTransform(boulderRotateY, (v) => {
    const s = Math.sin((v * Math.PI) / 180);
    return 0.08 + Math.max(0, s) * 0.52;
  });
  const leftFaceOpacity = useTransform(boulderRotateY, (v) => {
    const s = Math.sin((v * Math.PI) / 180);
    return 0.08 + Math.max(0, -s) * 0.52;
  });
  const topFaceOpacity = useTransform(boulderRotateX, (v) => {
    const s = Math.sin((-v * Math.PI) / 180);
    return 0.08 + Math.max(0, s) * 0.42;
  });
  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
  function normalizeDegrees(angle: number): number {
    const n = angle % 360;
    return n < 0 ? n + 360 : n;
  }
  function getFacingFace(angleDeg: number): "front" | "right" | "back" | "left" {
    const a = normalizeDegrees(angleDeg);
    if (a >= 45 && a < 135) return "right";
    if (a >= 135 && a < 225) return "back";
    if (a >= 225 && a < 315) return "left";
    return "front";
  }
  const activeHoldFaceRotateY = activeHoldFace === "front" ? 0 : activeHoldFace === "right" ? 90 : activeHoldFace === "back" ? 180 : -90;
  type NonFeatureHold = {
    left: string;
    top: string;
    kind: "jug" | "crimp" | "sloper" | "edge" | "pinch" | "pocket" | "sidepull";
    w: string;
    h: string;
    r: string;
    insetW: string;
    insetH: string;
    rot: string;
  };
  const nonFeatureRouteUpperByFace: Record<"front" | "right" | "back" | "left", NonFeatureHold[]> = {
    front: [
      { left: "38%", top: "68%", kind: "jug", w: "40px", h: "28px", r: "34% 34% 42% 42% / 38% 38% 62% 62%", insetW: "58%", insetH: "58%", rot: "-14deg" },
      { left: "42%", top: "60%", kind: "crimp", w: "28px", h: "10px", r: "22% 22% 36% 36% / 56% 56% 44% 44%", insetW: "82%", insetH: "40%", rot: "11deg" },
      { left: "62%", top: "34%", kind: "edge", w: "30px", h: "12px", r: "18% 18% 24% 24% / 48% 48% 52% 52%", insetW: "86%", insetH: "34%", rot: "8deg" },
      { left: "66%", top: "58%", kind: "pinch", w: "18px", h: "34px", r: "44% 44% 44% 44% / 28% 28% 72% 72%", insetW: "58%", insetH: "56%", rot: "14deg" },
    ],
    right: [
      { left: "36%", top: "70%", kind: "pocket", w: "30px", h: "24px", r: "44% 44% 48% 48% / 42% 42% 58% 58%", insetW: "54%", insetH: "44%", rot: "-12deg" },
      { left: "44%", top: "56%", kind: "edge", w: "30px", h: "12px", r: "18% 18% 24% 24% / 48% 48% 52% 52%", insetW: "86%", insetH: "34%", rot: "8deg" },
      { left: "58%", top: "40%", kind: "sidepull", w: "20px", h: "34px", r: "42% 42% 42% 42% / 24% 24% 76% 76%", insetW: "58%", insetH: "56%", rot: "-8deg" },
      { left: "68%", top: "60%", kind: "crimp", w: "28px", h: "10px", r: "22% 22% 36% 36% / 56% 56% 44% 44%", insetW: "82%", insetH: "40%", rot: "15deg" },
    ],
    back: [
      { left: "34%", top: "66%", kind: "jug", w: "38px", h: "26px", r: "34% 34% 42% 42% / 38% 38% 62% 62%", insetW: "58%", insetH: "58%", rot: "-10deg" },
      { left: "46%", top: "52%", kind: "sloper", w: "34px", h: "18px", r: "58% 42% 46% 54% / 72% 74% 26% 28%", insetW: "68%", insetH: "50%", rot: "9deg" },
      { left: "60%", top: "38%", kind: "pinch", w: "18px", h: "34px", r: "44% 44% 44% 44% / 28% 28% 72% 72%", insetW: "58%", insetH: "56%", rot: "-6deg" },
      { left: "68%", top: "56%", kind: "edge", w: "30px", h: "12px", r: "18% 18% 24% 24% / 48% 48% 52% 52%", insetW: "86%", insetH: "34%", rot: "12deg" },
    ],
    left: [
      { left: "40%", top: "70%", kind: "sidepull", w: "20px", h: "34px", r: "42% 42% 42% 42% / 24% 24% 76% 76%", insetW: "58%", insetH: "56%", rot: "-14deg" },
      { left: "48%", top: "58%", kind: "pocket", w: "30px", h: "24px", r: "44% 44% 48% 48% / 42% 42% 58% 58%", insetW: "54%", insetH: "44%", rot: "10deg" },
      { left: "58%", top: "44%", kind: "crimp", w: "28px", h: "10px", r: "22% 22% 36% 36% / 56% 56% 44% 44%", insetW: "82%", insetH: "40%", rot: "-8deg" },
      { left: "66%", top: "34%", kind: "jug", w: "40px", h: "28px", r: "34% 34% 42% 42% / 38% 38% 62% 62%", insetW: "58%", insetH: "58%", rot: "7deg" },
    ],
  };
  const nonFeatureRouteLowerByFace: Record<"front" | "right" | "back" | "left", NonFeatureHold[]> = {
    front: [
      { left: "28%", top: "24%", kind: "sloper", w: "36px", h: "20px", r: "58% 42% 46% 54% / 72% 74% 26% 28%", insetW: "70%", insetH: "50%", rot: "-18deg" },
      { left: "74%", top: "22%", kind: "crimp", w: "26px", h: "10px", r: "22% 22% 34% 34% / 56% 56% 44% 44%", insetW: "82%", insetH: "40%", rot: "12deg" },
      { left: "26%", top: "50%", kind: "edge", w: "24px", h: "10px", r: "18% 18% 24% 24% / 48% 48% 52% 52%", insetW: "86%", insetH: "34%", rot: "-11deg" },
      { left: "22%", top: "66%", kind: "pocket", w: "30px", h: "24px", r: "44% 44% 48% 48% / 42% 42% 58% 58%", insetW: "54%", insetH: "44%", rot: "-8deg" },
      { left: "80%", top: "42%", kind: "sidepull", w: "20px", h: "34px", r: "42% 42% 42% 42% / 24% 24% 76% 76%", insetW: "58%", insetH: "56%", rot: "-12deg" },
    ],
    right: [
      { left: "30%", top: "24%", kind: "crimp", w: "26px", h: "10px", r: "22% 22% 34% 34% / 56% 56% 44% 44%", insetW: "82%", insetH: "40%", rot: "-16deg" },
      { left: "74%", top: "24%", kind: "jug", w: "38px", h: "27px", r: "34% 34% 42% 42% / 38% 38% 62% 62%", insetW: "58%", insetH: "58%", rot: "10deg" },
      { left: "24%", top: "50%", kind: "pocket", w: "30px", h: "24px", r: "44% 44% 48% 48% / 42% 42% 58% 58%", insetW: "54%", insetH: "44%", rot: "-9deg" },
      { left: "30%", top: "68%", kind: "sloper", w: "36px", h: "20px", r: "58% 42% 46% 54% / 72% 74% 26% 28%", insetW: "70%", insetH: "50%", rot: "14deg" },
      { left: "78%", top: "44%", kind: "edge", w: "24px", h: "10px", r: "18% 18% 24% 24% / 48% 48% 52% 52%", insetW: "86%", insetH: "34%", rot: "-10deg" },
    ],
    back: [
      { left: "26%", top: "24%", kind: "pinch", w: "18px", h: "33px", r: "44% 44% 44% 44% / 28% 28% 72% 72%", insetW: "58%", insetH: "56%", rot: "-12deg" },
      { left: "74%", top: "24%", kind: "sloper", w: "36px", h: "20px", r: "58% 42% 46% 54% / 72% 74% 26% 28%", insetW: "70%", insetH: "50%", rot: "11deg" },
      { left: "26%", top: "52%", kind: "sidepull", w: "20px", h: "34px", r: "42% 42% 42% 42% / 24% 24% 76% 76%", insetW: "58%", insetH: "56%", rot: "-8deg" },
      { left: "22%", top: "68%", kind: "edge", w: "24px", h: "10px", r: "18% 18% 24% 24% / 48% 48% 52% 52%", insetW: "86%", insetH: "34%", rot: "9deg" },
      { left: "78%", top: "44%", kind: "pocket", w: "30px", h: "24px", r: "44% 44% 48% 48% / 42% 42% 58% 58%", insetW: "54%", insetH: "44%", rot: "-12deg" },
    ],
    left: [
      { left: "28%", top: "24%", kind: "edge", w: "24px", h: "10px", r: "18% 18% 24% 24% / 48% 48% 52% 52%", insetW: "86%", insetH: "34%", rot: "-16deg" },
      { left: "72%", top: "24%", kind: "pocket", w: "30px", h: "24px", r: "44% 44% 48% 48% / 42% 42% 58% 58%", insetW: "54%", insetH: "44%", rot: "10deg" },
      { left: "24%", top: "52%", kind: "jug", w: "38px", h: "27px", r: "34% 34% 42% 42% / 38% 38% 62% 62%", insetW: "58%", insetH: "58%", rot: "-11deg" },
      { left: "24%", top: "68%", kind: "crimp", w: "26px", h: "10px", r: "22% 22% 34% 34% / 56% 56% 44% 44%", insetW: "82%", insetH: "40%", rot: "8deg" },
      { left: "78%", top: "42%", kind: "sloper", w: "36px", h: "20px", r: "58% 42% 46% 54% / 72% 74% 26% 28%", insetW: "70%", insetH: "50%", rot: "-10deg" },
    ],
  };
  const activeUpperNonFeatureHolds = nonFeatureRouteUpperByFace[activeHoldFace];
  const activeLowerNonFeatureHolds = nonFeatureRouteLowerByFace[activeHoldFace];
  function handleBoulderPointerDown(e: ReactPointerEvent<HTMLElement>) {
    startPointerXRef.current = e.clientX;
    startPointerYRef.current = e.clientY;
    dragMovedForClickRef.current = false;
    lastPointerXRef.current = e.clientX;
    lastPointerYRef.current = e.clientY;
    setIsBoulderDragging(false);
    isBoulderDraggingRef.current = false;

    const dragThreshold = e.pointerType === "touch" ? 12 : 10;

    const onMove = (ev: PointerEvent) => {
      const startX = startPointerXRef.current;
      const startY = startPointerYRef.current;
      const lastX = lastPointerXRef.current;
      const lastY = lastPointerYRef.current;
      if (startX === null || startY === null || lastX === null || lastY === null) return;

      const dxTotal = ev.clientX - startX;
      const dyTotal = ev.clientY - startY;
      const dist = Math.hypot(dxTotal, dyTotal);
      if (dist <= dragThreshold) return;

      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastPointerXRef.current = ev.clientX;
      lastPointerYRef.current = ev.clientY;

      if (!dragMovedForClickRef.current) dragMovedForClickRef.current = true;
      if (!isBoulderDraggingRef.current) {
        isBoulderDraggingRef.current = true;
        setIsBoulderDragging(true);
      }
      const nextY = boulderRotateY.get() + dx * 0.62;
      boulderRotateY.set(nextY);
      boulderRotateX.set(clamp(boulderRotateX.get() - dy * 0.36, -34, 34));
      setActiveHoldFace(getFacingFace(nextY));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      lastPointerXRef.current = null;
      lastPointerYRef.current = null;
      startPointerXRef.current = null;
      startPointerYRef.current = null;
      setIsBoulderDragging(false);
      isBoulderDraggingRef.current = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
  }


  const FEATURE_ITEMS = useMemo(
    () =>
      [
        {
          title: "Track Progress",
          desc: "Log every attempt and watch your climbing trend level up over time.",
          Icon: TrendingUp,
          href: "/sessions",
        },
        {
          title: "Grade Converter",
          desc: "Translate grades across gyms quickly so sessions feel less confusing.",
          Icon: Mountain,
          href: "/grades",
        },
        {
          title: "Find Partners",
          desc: "Post your session plans and connect with climbers at similar levels.",
          Icon: Users,
          href: "/partners",
        },
      ] as const,
    [],
  );

  useEffect(() => {
    const payload = {
      quizStep,
      quiz,
      resultType,
      selectedQuestionIndices,
    };
    try {
      window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [quizStep, quiz, resultType, selectedQuestionIndices]);

  const prevQuizResultTypeRef = useRef<ClimberType | null>(null);
  const [quizSurpriseNonce, setQuizSurpriseNonce] = useState(0);
  const [isFeatureBoulderInView, setIsFeatureBoulderInView] = useState(false);
  const [isQuizSurprisePending, setIsQuizSurprisePending] = useState(false);
  const [hasRevealedQuizSurprise, setHasRevealedQuizSurprise] = useState(false);
  const [isSurpriseHintOpen, setIsSurpriseHintOpen] = useState(false);
  const [surpriseBoostTapCount, setSurpriseBoostTapCount] = useState(0);
  const [activeBoost, setActiveBoost] = useState<string>(CLIMB_BOOSTS[0] ?? "You got this.");
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
    // Keep surprise holds on the right / lower boulder so they don’t sit on the ascending pocket route.
    const posCandidates = [
      { left: "82%", top: "68%", rotate: "-12deg" },
      { left: "84%", top: "52%", rotate: "10deg" },
      { left: "76%", top: "76%", rotate: "-8deg" },
      { left: "86%", top: "38%", rotate: "14deg" },
      { left: "78%", top: "60%", rotate: "-10deg" },
      { left: "72%", top: "72%", rotate: "9deg" },
    ];
    const shapeCandidates = [
      "72% 28% 40% 60% / 58% 42% 70% 30%",
      "60% 40% 65% 35% / 35% 65% 45% 55%",
      "48% 52% 58% 42% / 62% 38% 45% 55%",
    ];
    const sizeCandidates = [
      { w: 56, h: 32 },
      { w: 52, h: 30 },
      { w: 60, h: 34 },
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

  useEffect(() => {
    if (!isSurpriseHintOpen) return;
    const t = window.setTimeout(() => setIsSurpriseHintOpen(false), 3200);
    return () => window.clearTimeout(t);
  }, [isSurpriseHintOpen]);

  function triggerHapticStyleEffect() {
    // Soft double buzz to mimic haptic feedback on supported devices.
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([18, 24, 18]);
    }
    setSurpriseTapPulseNonce((n) => n + 1);
  }

  function computeType(nextQuiz: QuizState): ClimberType | "" {
    const values = AXES.map((ax) => nextQuiz[ax.key]);
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

  /** Blurb only — headline is shown once as “The {resultType}” to avoid repeating “You are…”. */
  const resultBlurb = useMemo(() => {
    if (!resultType) return null;
    if (resultType === "Technician") {
      return "All about details: tidy foot placements, clean body positions, and smart repeats.";
    }
    if (resultType === "Explorer") {
      return "Progress comes from variety — weird beta, new styles, and exploring different wall sections.";
    }
    if (resultType === "Strategist") {
      return "Plans beat panic: one clear target, tracked attempts, and steady progress through the session.";
    }
    if (resultType === "Flow Climber") {
      return "Best when movement feels smooth: rhythm, breathing, and timing over brute force.";
    }
    if (resultType === "Motivator") {
      return "Energy is fuel: a bit of hype and friendly noise can unlock moves that felt stuck.";
    }
    if (resultType === "Grinder") {
      return "Process-first: same climb, cleaner tries, small upgrades each burn until it clicks.";
    }
    if (resultType === "Risk-Taker") {
      return "Commits hard: big moves and less hesitation — learning curve includes some dramatic whips.";
    }
    return "Steady under pressure: reads routes calmly, stays relaxed, and keeps composure on the wall.";
  }, [resultType]);

  const currentAxis = AXES[quizStep] ?? null;

  return (
    <Layout>
      <div className="relative rounded-2xl overflow-hidden mb-8 sm:mb-12 bg-teal-950 border border-teal-900/30 shadow-[0_0_40px_rgba(0,212,170,0.05)]">
        <div className="absolute inset-0 z-0">
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

      <div ref={featureBoulderSectionRef} className="overflow-visible">
        <Card className="overflow-visible p-6 sm:p-8 border-none bg-transparent">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Feature Boulder</p>
          <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wider mt-2">
            Tap a hold to view feature
          </h2>
        </div>

        <div className="overflow-visible grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 sm:gap-8 items-center">
          <div className="flex flex-col items-center overflow-visible py-4 sm:py-6" style={{ perspective: "900px" }}>
            <motion.div
              onPointerDownCapture={handleBoulderPointerDown}
              style={{ rotateX: boulderRotateX, rotateY: boulderRotateY, transformStyle: "preserve-3d" }}
              className={`relative w-[20rem] h-[16rem] sm:w-[24rem] sm:h-[18rem] md:w-[30rem] md:h-[22rem] touch-none select-none ${isBoulderDragging ? "cursor-grabbing" : "cursor-grab"}`}
            >
              {/* Main irregular boulder body (Fountainebleau-ish silhouette) */}
              {/* Outer glow — subtle breathing pulse, with larger bleed so it won't clip at edges */}
              <motion.div
                aria-hidden="true"
                className="absolute -inset-2 sm:-inset-1 bg-primary/55 blur-2xl pointer-events-none will-change-transform"
                style={{
                  clipPath:
                    "polygon(5% 24%, 16% 8%, 35% 10%, 49% 2%, 70% 8%, 86% 22%, 96% 44%, 88% 60%, 97% 76%, 80% 93%, 60% 86%, 43% 97%, 24% 87%, 8% 67%, 3% 43%)",
                }}
                initial={{ opacity: 0.5, scale: 1 }}
                animate={{ opacity: [0.48, 0.72, 0.54], scale: [0.99, 1.02, 1] }}
                transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
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
              {/* Dynamic side faces so drag reveals different boulder sides */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: rightFaceOpacity,
                  clipPath:
                    "polygon(70% 8%, 86% 22%, 96% 44%, 88% 60%, 97% 76%, 80% 93%, 74% 84%, 83% 70%, 76% 54%, 84% 40%, 77% 22%, 66% 14%)",
                  transform: "translate3d(10px, 8px, -14px)",
                  background:
                    "linear-gradient(115deg, rgba(6,22,22,0.62) 0%, rgba(10,28,28,0.82) 55%, rgba(3,14,14,0.94) 100%)",
                }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: leftFaceOpacity,
                  clipPath:
                    "polygon(5% 24%, 16% 8%, 35% 10%, 28% 22%, 18% 33%, 22% 50%, 12% 64%, 20% 82%, 8% 67%, 3% 43%)",
                  transform: "translate3d(-10px, 8px, -14px)",
                  background:
                    "linear-gradient(245deg, rgba(6,22,22,0.62) 0%, rgba(10,28,28,0.82) 55%, rgba(3,14,14,0.94) 100%)",
                }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: topFaceOpacity,
                  clipPath:
                    "polygon(16% 8%, 35% 10%, 49% 2%, 70% 8%, 86% 22%, 77% 24%, 63% 19%, 49% 12%, 32% 16%, 18% 18%)",
                  transform: "translate3d(0px, -8px, -10px)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 40%, rgba(0,0,0,0.26) 100%)",
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

              {/* Non-tappable pockets along zigzag — varied sizes */}
              {activeUpperNonFeatureHolds.map((d, i) => (
                <span
                  key={`route-pocket-${i}`}
                  aria-hidden="true"
                  className="absolute z-[5] -translate-x-1/2 -translate-y-1/2 overflow-hidden pointer-events-none border border-border/30 opacity-80"
                  style={{
                    left: d.left,
                    top: d.top,
                    width: d.w,
                    height: d.h,
                    borderRadius: d.r,
                    transform: `rotate(${d.rot}) rotateY(${activeHoldFaceRotateY}deg) translate(-50%, -50%) translateZ(8px)`,
                    clipPath:
                      d.kind === "crimp"
                        ? "polygon(2% 30%, 98% 18%, 96% 74%, 6% 88%)"
                        : d.kind === "jug"
                          ? "ellipse(50% 46% at 50% 50%)"
                          : d.kind === "edge"
                            ? "polygon(0% 38%, 100% 26%, 100% 72%, 0% 86%)"
                            : d.kind === "pinch"
                              ? "polygon(22% 6%, 78% 6%, 94% 36%, 84% 88%, 16% 88%, 6% 36%)"
                              : "polygon(8% 62%, 24% 28%, 58% 18%, 88% 36%, 92% 70%, 56% 86%, 18% 82%)",
                    background:
                      d.kind === "crimp"
                        ? "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.22) 100%)"
                        : d.kind === "jug"
                          ? "radial-gradient(circle at 45% 30%, rgba(255,255,255,0.16) 0%, rgba(0,0,0,0.20) 72%)"
                          : d.kind === "edge"
                            ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.24) 100%)"
                            : d.kind === "pinch"
                              ? "linear-gradient(90deg, rgba(255,255,255,0.14) 0%, rgba(0,0,0,0.24) 50%, rgba(255,255,255,0.10) 100%)"
                              : "linear-gradient(200deg, rgba(255,255,255,0.14) 0%, rgba(0,0,0,0.22) 75%)",
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 8px 14px rgba(0,0,0,0.18)",
                  }}
                >
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-95 pointer-events-none"
                    style={{
                      width: d.insetW,
                      height: d.insetH,
                      borderRadius: d.kind === "crimp" ? "18% 18% 40% 40% / 48% 48% 52% 52%" : "9999px",
                      background:
                        d.kind === "crimp"
                          ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.46) 100%)"
                          : d.kind === "edge"
                            ? "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(0,0,0,0.48) 100%)"
                            : "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 20%, rgba(0,0,0,0.16) 48%, rgba(0,0,0,0.38) 78%, rgba(0,0,0,0.48) 100%)",
                      boxShadow:
                        "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -12px 22px rgba(0,0,0,0.20), inset 0 10px 16px rgba(0,212,170,0.07)",
                    }}
                  />
                </span>
              ))}

              {/* Tappable pockets — zigzag, varied sizes */}
              {FEATURE_ITEMS.map((f, idx) => {
                const isActive = idx === activeFeatureIdx;
                const pos =
                  idx === 0
                    ? { left: "32%", top: "78%", rotate: "-11deg" }
                    : idx === 1
                      ? { left: "48%", top: "52%", rotate: "9deg" }
                      : { left: "68%", top: "26%", rotate: "-7deg" };
                const pocketShell =
                  idx === 0
                    ? {
                        w: 56,
                        h: 24,
                        r: "92% 8% 58% 42% / 30% 70% 28% 72%",
                        insetW: "68%",
                        insetH: "68%",
                        icon: "w-5 h-5" as const,
                      }
                    : idx === 1
                      ? {
                          w: 74,
                          h: 44,
                          r: "86% 14% 62% 38% / 44% 56% 28% 72%",
                          insetW: "76%",
                          insetH: "76%",
                          icon: "w-6 h-6" as const,
                        }
                      : {
                          w: 52,
                          h: 30,
                          r: "78% 22% 52% 48% / 46% 54% 36% 64%",
                          insetW: "70%",
                          insetH: "70%",
                          icon: "w-4 h-4" as const,
                        };
                const ActiveIcon = f.Icon;

                return (
                  <button
                    key={f.title}
                    type="button"
                    onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                      if (dragMovedForClickRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        dragMovedForClickRef.current = false;
                        return;
                      }
                      setActiveFeatureIdx(idx);
                    }}
                    aria-label={f.title}
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${isBoulderDragging ? "pointer-events-none" : ""}`}
                    style={{
                      left: pos.left,
                      top: pos.top,
                      transform: `translate(-50%, -50%) rotate(${pos.rotate}) rotateY(${activeHoldFaceRotateY}deg) translateZ(10px)`,
                    }}
                  >
                    <motion.span
                      className={`relative block overflow-hidden border transition-all ${
                        isActive
                          ? "border-primary shadow-[0_0_22px_rgba(0,212,170,0.55)]"
                          : "border-border/30"
                      }`}
                      style={{
                        z: 10,
                        width: `${pocketShell.w}px`,
                        height: `${pocketShell.h}px`,
                        borderRadius: pocketShell.r,
                        background: isActive ? "rgba(0,212,170,0.12)" : "rgba(0,0,0,0.12)",
                        boxShadow: isActive
                          ? "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 8px 14px rgba(0,0,0,0.2), 0 0 12px rgba(0,212,170,0.25)"
                          : "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 8px 12px rgba(0,0,0,0.18)",
                      }}
                    >
                      {/* Same pocket recess as static wall holds */}
                      <span
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          width: pocketShell.insetW,
                          height: pocketShell.insetH,
                          borderRadius: "9999px",
                          background:
                            "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 20%, rgba(0,0,0,0.16) 48%, rgba(0,0,0,0.38) 78%, rgba(0,0,0,0.48) 100%)",
                          boxShadow:
                            "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -12px 22px rgba(0,0,0,0.20), inset 0 10px 16px rgba(0,212,170,0.07)",
                        }}
                      />
                      <span className="relative z-10 flex items-center justify-center h-full w-full">
                        <ActiveIcon
                          className={`${pocketShell.icon} drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] ${isActive ? "text-primary" : "text-primary/85"}`}
                          strokeWidth={2.25}
                        />
                      </span>
                    </motion.span>
                  </button>
                );
              })}

              {/* Quiz surprise hold (tap for mini wow) */}
              {resultType && quizSurpriseHoldConfig && (
                <button
                  type="button"
                  aria-label="Surprise hold"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHapticStyleEffect();
                    if (surpriseBoostTapCount === 0) {
                      const randomBoost =
                        CLIMB_BOOSTS[Math.floor(Math.random() * CLIMB_BOOSTS.length)] ??
                        "Stay calm, trust your feet, and have fun.";
                      setActiveBoost(randomBoost);
                    } else {
                      setActiveBoost(FOLLOW_UP_BOOST);
                    }
                    setSurpriseBoostTapCount((n) => n + 1);
                    setIsSurpriseHintOpen(true);
                  }}
                  className={`absolute z-20 overflow-visible -translate-x-1/2 -translate-y-1/2 ${isBoulderDragging ? "pointer-events-none" : "pointer-events-auto cursor-pointer"}`}
                  style={{
                    left: quizSurpriseHoldConfig.pos.left,
                    top: quizSurpriseHoldConfig.pos.top,
                    transform: `translate(-50%, -50%) rotate(${quizSurpriseHoldConfig.pos.rotate}) rotateY(${activeHoldFaceRotateY}deg) translateZ(12px)`,
                    width: `${quizSurpriseHoldConfig.w}px`,
                    height: `${quizSurpriseHoldConfig.h}px`,
                  }}
                >
                  {/* Pocket shell only (clipped) — drill/dust live in sibling overlay */}
                  <motion.span
                    className="relative z-[1] block overflow-hidden border border-border/30 transition-all"
                    style={{
                      z: 12,
                      width: "100%",
                      height: "100%",
                      borderRadius: quizSurpriseHoldConfig.borderRadius,
                      background: "rgba(0,0,0,0.12)",
                      boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 8px 14px rgba(0,0,0,0.2), 0 0 0 1px ${quizSurpriseHoldConfig.border}, 0 0 14px ${quizSurpriseHoldConfig.glow}`,
                    }}
                  >
                    {/* Pocket recess (same recipe as feature / route pockets) */}
                    {hasRevealedQuizSurprise ? (
                      <motion.span
                        key={`quiz-surprise-pocket-${quizSurpriseNonce}`}
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-95"
                        style={{
                          width: "72%",
                          height: "72%",
                          borderRadius: "9999px",
                          background:
                            "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 20%, rgba(0,0,0,0.16) 48%, rgba(0,0,0,0.38) 78%, rgba(0,0,0,0.48) 100%)",
                          boxShadow:
                            "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -12px 22px rgba(0,0,0,0.20), inset 0 10px 16px rgba(0,212,170,0.07)",
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
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-95"
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
                    )}

                    {/* Tap pulse stays inside pocket bounds */}
                    {surpriseTapPulseNonce > 0 && (
                      <motion.span
                        key={`surprise-tap-pulse-${surpriseTapPulseNonce}`}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                          width: "92%",
                          height: "92%",
                          border: "1.5px solid rgba(255,255,255,0.70)",
                          boxShadow: `0 0 0 1px ${quizSurpriseHoldConfig.border}, 0 0 18px ${quizSurpriseHoldConfig.glow}`,
                        }}
                        initial={{ scale: 0.72, opacity: 0.95 }}
                        animate={{ scale: 1.18, opacity: 0 }}
                        transition={{ duration: 0.34, ease: "easeOut" }}
                      />
                    )}
                  </motion.span>

                  {/* Drill + dust + reveal pulse — large overflow-visible overlay (not clipped) */}
                  {hasRevealedQuizSurprise && (
                    <span
                      className="pointer-events-none absolute left-1/2 top-1/2 z-[100] h-[min(280px,70vw)] w-[min(280px,85vw)] -translate-x-1/2 -translate-y-1/2 overflow-visible"
                      aria-hidden
                    >
                      <motion.span
                        key={`quiz-surprise-pulse-${quizSurpriseNonce}`}
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full opacity-0 blur-[0.5px]"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.25) 22%, ${quizSurpriseHoldConfig.bg} 50%, rgba(0,0,0,0) 70%)`,
                        }}
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: [0, 1, 0], scale: [0.85, 1.2, 1.05] }}
                        transition={{ duration: 1.9, ease: "easeOut" }}
                      />

                      {/* Dust at hold centre (same origin as pulse) — not inside drill box or particles skew sideways */}
                      <>
                          {/* Drilling dust (stacked layers: chunks, fine cloud, puff rings) */}

                          {/* Layer 1: Heavy chalk/concrete chunks (slow, fall/roll away) */}
                          {Array.from({ length: 24 }).map((_, i) => {
                            const angle = (i / 12) * Math.PI - Math.PI * 0.1;
                            const speed = 0.7 + Math.random() * 0.5;
                            // Keep horizontal drift modest so dust reads as "falling off" the face.
                            const dx = Math.cos(angle) * (8 + i * 2.1) * speed;
                            // Strong gravity pull so chunks drop down off the boulder.
                            const dy = 20 + i * 4.2 + Math.abs(Math.sin(angle)) * 8 * speed;
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
                                  duration: 3.4 + i * 0.22,
                                  delay: 1.0 + i * 0.035,
                                  ease: "easeOut",
                                }}
                              />
                            );
                          })}

                          {/* Layer 2: Fine chalk dust cloud (wide spread, lingers) */}
                          {Array.from({ length: 60 }).map((_, i) => {
                            const angle = (i / 60) * Math.PI * 2;
                            const r = 8 + i * 1.25;
                            const dx = Math.cos(angle) * r * 0.45;
                            // Fine dust also falls down with slight drift.
                            const dy = 16 + i * 1.35 + Math.abs(Math.sin(angle)) * 6;
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
                                  x: [0, dx * 0.35, dx],
                                  y: [0, dy * 0.45, dy],
                                  opacity: [0, 0.85, 0.5, 0],
                                }}
                                transition={{
                                  duration: 5.4 + (i % 6) * 0.5,
                                  delay: 0.95 + (i % 9) * 0.06,
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
                                duration: 2.6 + i * 0.5,
                                delay: 1.0 + i * 0.24,
                                ease: "easeOut",
                              }}
                            />
                          ))}
                      </>

                      {/* Bit tip at hold centre; compact silhouette so nothing sticks out awkwardly */}
                      <span
                        className="pointer-events-none absolute left-1/2 top-1/2 z-[999] overflow-visible"
                        style={{ marginTop: -12 }}
                      >
                        <motion.span
                          key={`quiz-surprise-drill-${quizSurpriseNonce}`}
                          aria-hidden="true"
                          className="relative block"
                          style={{
                            width: 84,
                            height: 40,
                            background: "transparent",
                            transformOrigin: "3px 20px",
                          }}
                          initial={{ opacity: 0, scale: 0.88, rotate: 12 }}
                          animate={{
                            opacity: [0, 1, 1, 0],
                            rotate: [12, 4, 2, 6],
                            scale: [0.88, 1.04, 1.0, 0.96],
                          }}
                          transition={{ duration: 10.5, ease: "easeInOut" }}
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
                              width: 28,
                              height: 4,
                              background: "#111111",
                              clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)",
                              borderRadius: 0,
                            }}
                          />

                          {/* Body — compact rounded rectangle */}
                          <span
                            aria-hidden="true"
                            className="absolute"
                            style={{
                              left: 24,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 46,
                              height: 16,
                              background: "#111111",
                              borderRadius: "8px 12px 12px 8px",
                            }}
                          />

                          {/* Handle — shorter grip so top doesn't poke out */}
                          <span
                            aria-hidden="true"
                            className="absolute"
                            style={{
                              left: 52,
                              top: 11,
                              width: 16,
                              height: 38,
                              background: "#111111",
                              borderRadius: "0 0 9px 9px",
                              opacity: 0.9,
                            }}
                          />
                        </motion.span>
                      </span>
                    </span>
                  )}

                  {isSurpriseHintOpen && (
                    <motion.span
                      className="absolute left-1/2 -top-24 sm:-top-28 z-[120] -translate-x-1/2 w-[15rem] sm:w-[18rem] rounded-xl border border-primary/40 bg-background/95 px-3 py-2 text-[11px] sm:text-xs text-foreground shadow-[0_0_24px_rgba(0,212,170,0.22)]"
                      initial={{ opacity: 0, y: 10, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                    >
                      <span className="block font-semibold text-primary">
                        ✨ Boom! Today's secret climb boost
                      </span>
                      <span className="block mt-1 leading-snug text-foreground/90">
                        {activeBoost}
                      </span>
                    </motion.span>
                  )}
                </button>
              )}

              {activeLowerNonFeatureHolds.map((d, i) => (
                <span
                  key={i}
                  className="absolute z-0 -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-border/30 opacity-75"
                  style={{
                    left: d.left,
                    top: d.top,
                    width: d.w,
                    height: d.h,
                    borderRadius: d.r,
                    transform: `rotate(${d.rot}) rotateY(${activeHoldFaceRotateY}deg) translate(-50%, -50%) translateZ(8px)`,
                    clipPath:
                      d.kind === "crimp"
                        ? "polygon(2% 30%, 98% 18%, 96% 74%, 6% 88%)"
                        : d.kind === "edge"
                            ? "polygon(0% 38%, 100% 26%, 100% 72%, 0% 86%)"
                            : d.kind === "pocket"
                                ? "ellipse(50% 48% at 50% 50%)"
                                : d.kind === "sidepull"
                                  ? "polygon(18% 2%, 80% 8%, 92% 28%, 88% 88%, 24% 98%, 10% 76%, 6% 30%)"
                                  : "polygon(8% 62%, 24% 28%, 58% 18%, 88% 36%, 92% 70%, 56% 86%, 18% 82%)",
                    background:
                      d.kind === "crimp"
                        ? "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.22) 100%)"
                        : d.kind === "edge"
                            ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.24) 100%)"
                            : d.kind === "pocket"
                                ? "radial-gradient(circle at 46% 30%, rgba(255,255,255,0.14) 0%, rgba(0,0,0,0.24) 76%)"
                                : d.kind === "sidepull"
                                  ? "linear-gradient(140deg, rgba(255,255,255,0.16) 0%, rgba(0,0,0,0.24) 72%)"
                                  : "linear-gradient(200deg, rgba(255,255,255,0.14) 0%, rgba(0,0,0,0.22) 75%)",
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 8px 14px rgba(0,0,0,0.18)",
                  }}
                >
                  {/* Hold pocket / hole (recess) */}
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-95 pointer-events-none"
                    style={{
                      width: d.insetW,
                      height: d.insetH,
                      borderRadius: d.kind === "crimp" ? "18% 18% 40% 40% / 48% 48% 52% 52%" : "9999px",
                      background:
                        d.kind === "crimp"
                          ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.46) 100%)"
                          : d.kind === "edge"
                            ? "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(0,0,0,0.48) 100%)"
                            : d.kind === "pocket"
                              ? "radial-gradient(circle at 50% 32%, rgba(255,255,255,0.22) 0%, rgba(0,0,0,0.28) 28%, rgba(0,0,0,0.56) 68%, rgba(0,0,0,0.72) 100%)"
                          : "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 20%, rgba(0,0,0,0.16) 48%, rgba(0,0,0,0.38) 78%, rgba(0,0,0,0.48) 100%)",
                      boxShadow:
                        d.kind === "sloper"
                          ? "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -8px 14px rgba(0,0,0,0.18), inset 0 6px 10px rgba(0,212,170,0.05)"
                          : d.kind === "pocket"
                            ? "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 -16px 22px rgba(0,0,0,0.34), inset 0 5px 8px rgba(0,212,170,0.04)"
                          : "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -12px 22px rgba(0,0,0,0.20), inset 0 10px 16px rgba(0,212,170,0.07)",
                    }}
                  />
                </span>
              ))}
            </motion.div>
          </div>

          <Link
            href={FEATURE_ITEMS[activeFeatureIdx]?.href ?? "/"}
            className="group relative block overflow-hidden rounded-xl border border-primary/20 bg-background/40 p-5 sm:p-6 text-left cursor-pointer transition-colors hover:border-primary/40 hover:bg-background/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{
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
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Now showing</p>
                <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-90 group-hover:opacity-100 shrink-0">
                  Open
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <div className="relative">
                <h3 className="font-display text-xl sm:text-2xl uppercase tracking-wider mt-2 pr-2">
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
          </Link>
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
                    setSelectedQuestionIndices(shuffleAndPickN(QUIZ_QUESTION_BANK.length, QUIZ_LENGTH));
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
                The {resultType}
              </p>
              {resultBlurb ? (
                <p className="text-muted-foreground mt-3 leading-relaxed text-sm sm:text-base">{resultBlurb}</p>
              ) : null}
              <p className="text-sm sm:text-base text-muted-foreground mt-3">
                Check the boulder to see a surprise.
              </p>

              <div className="mt-5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedQuestionIndices(shuffleAndPickN(QUIZ_QUESTION_BANK.length, QUIZ_LENGTH));
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
