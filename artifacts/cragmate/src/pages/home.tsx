import { Layout } from "@/components/layout";
import { Button, Card, Dialog } from "@/components/ui";
import { CLIMB_BOOSTS } from "@/lib/climb-boosts";
import { QUESTION_BANK } from "@/lib/quiz-bank";
import { Link } from "wouter";
import { ArrowRight, Compass, Mountain, TrendingUp, Users, ChevronUp } from "lucide-react";
import Lenis from "lenis";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, useMotionTemplate, useMotionValue, useTransform } from "framer-motion";
import { useScroll } from "framer-motion";

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
  const [quizStarted, setQuizStarted] = useState(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return false;
      const p = JSON.parse(raw) as { quizStarted?: boolean; quizStep?: number; resultType?: string };
      if (typeof p.quizStarted === "boolean") return p.quizStarted;
      return typeof p.quizStep === "number" && p.quizStep > 0 ? true : Boolean(p.resultType);
    } catch {
      return false;
    }
  });
  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0);
  const [contactPopupOpen, setContactPopupOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTopic, setContactTopic] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
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
  const [heroPointer, setHeroPointer] = useState({ x: 0, y: 0 });
  const [pageDustTrail, setPageDustTrail] = useState<Array<{ id: number; x: number; y: number; size: number; bornAt: number }>>([]);
  const pageDustTrailIdRef = useRef(0);
  const pageDustTrailLastSpawnRef = useRef(0);
  const [hoveredConquerLetterIdx, setHoveredConquerLetterIdx] = useState<number | null>(null);
  const [beginnerPopupOpen, setBeginnerPopupOpen] = useState(false);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
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
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroSectionRef,
    offset: ["start start", "end start"],
  });
  const heroSectionOpacity = useTransform(heroScrollProgress, [0, 0.46, 0.82], [1, 1, 0]);
  const heroSectionY = useTransform(heroScrollProgress, [0, 0.56], [0, -84]);
  const heroSectionScale = useTransform(heroScrollProgress, [0, 0.2, 0.56], [1, 0.88, 0.42]);
  const heroSectionBlur = useTransform(heroScrollProgress, [0, 0.2, 0.56], [0, 4, 18]);
  const heroSectionBrightness = useTransform(heroScrollProgress, [0, 0.56], [1, 0.42]);
  const heroSectionFilter = useMotionTemplate`blur(${heroSectionBlur}px) brightness(${heroSectionBrightness})`;
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
      quizStarted,
      selectedQuestionIndices,
    };
    try {
      window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [quizStep, quiz, resultType, quizStarted, selectedQuestionIndices]);

  const prevQuizResultTypeRef = useRef<ClimberType | null>(null);
  const [quizSurpriseNonce, setQuizSurpriseNonce] = useState(0);
  const [isFeatureBoulderInView, setIsFeatureBoulderInView] = useState(false);
  const [isQuizSurprisePending, setIsQuizSurprisePending] = useState(false);
  const [hasRevealedQuizSurprise, setHasRevealedQuizSurprise] = useState(false);
  const [isSurpriseHintOpen, setIsSurpriseHintOpen] = useState(false);
  const [surpriseBoostTapCount, setSurpriseBoostTapCount] = useState(0);
  const [activeBoost, setActiveBoost] = useState<string>(CLIMB_BOOSTS[0] ?? "You got this.");
  const featureBoulderSectionRef = useRef<HTMLDivElement | null>(null);
  const quizSectionRef = useRef<HTMLDivElement | null>(null);
  const quizLoopCooldownRef = useRef(false);
  const prevScrollYRef = useRef(0);
  const lenisRef = useRef<Lenis | null>(null);
  const { scrollYProgress: featureScrollProgress } = useScroll({
    target: featureBoulderSectionRef,
    offset: ["start end", "end start"],
  });
  const featureSectionOpacity = useTransform(featureScrollProgress, [0, 0.16, 0.58, 1], [0, 0.82, 1, 0]);
  const featureSectionY = useTransform(featureScrollProgress, [0, 0.28, 1], [54, 0, -96]);
  const featureSectionBlur = useTransform(featureScrollProgress, [0, 0.18, 0.62, 1], [8, 0, 0.6, 6]);
  const featureSectionFilter = useMotionTemplate`blur(${featureSectionBlur}px)`;
  const { scrollYProgress: quizScrollProgress } = useScroll({
    target: quizSectionRef,
    offset: ["start end", "end start"],
  });
  const quizSectionOpacity = useTransform(quizScrollProgress, [0, 0.24, 0.8, 1], [0.08, 1, 1, 0.2]);
  const quizSectionY = useTransform(quizScrollProgress, [0, 0.4, 1], [72, 0, -20]);
  const quizSectionBlur = useTransform(quizScrollProgress, [0, 0.2, 0.78, 1], [7, 0, 0.4, 5]);
  const quizSectionFilter = useMotionTemplate`blur(${quizSectionBlur}px)`;
  const quizGradientShiftX = useTransform(quizScrollProgress, [0, 1], [4, 92]);
  const quizGradientOpacity = useTransform(quizScrollProgress, [0, 0.24, 0.8, 1], [0.16, 0.42, 0.55, 0.22]);
  const quizGradientBackgroundPosition = useMotionTemplate`0% 0%, 0% 0%, ${quizGradientShiftX}% 50%`;

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

  const quizSurpriseHoldConfig = resultType ? getQuizSurpriseHoldConfig(resultType) : null;

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
  const brandLetters = "CRAGMATE".split("");
  const conquerLetters = "Conquer The Crag".split("");
  const heroDustSpecs = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${4 + ((i * 17) % 92)}%`,
        top: `${10 + ((i * 13) % 76)}%`,
        size: 1.2 + (i % 4) * 1.1,
        delay: (i % 8) * 0.22,
        duration: 5.4 + (i % 7) * 0.55,
        drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 2),
      })),
    [],
  );

  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.8,
      lerp: 0.12,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      syncTouch: true,
    });
    lenisRef.current = lenis;
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);
    return () => {
      window.cancelAnimationFrame(rafId);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const triggerLoopToTop = () => {
      if (quizLoopCooldownRef.current) return;
      quizLoopCooldownRef.current = true;
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      window.setTimeout(() => {
        quizLoopCooldownRef.current = false;
      }, 1800);
    };
    const onScroll = () => {
      const currentY = window.scrollY;
      const movingDown = currentY > prevScrollYRef.current;
      prevScrollYRef.current = currentY;
      if (!movingDown) return;
      const quizEl = quizSectionRef.current;
      if (!quizEl) return;
      const rect = quizEl.getBoundingClientRect();
      const hasScrolledPastQuiz = rect.bottom <= 0;
      if (!hasScrolledPastQuiz) return;
      triggerLoopToTop();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [quizScrollProgress]);

  return (
    <Layout>
      <div
        className="relative"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const now = performance.now();
          if (now - pageDustTrailLastSpawnRef.current <= 24) return;
          pageDustTrailLastSpawnRef.current = now;
          const id = pageDustTrailIdRef.current++;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const size = 2.2 + ((id % 5) * 0.7);
          setPageDustTrail((prev) => [...prev.filter((p) => now - p.bornAt < 420), { id, x, y, size, bornAt: now }]);
        }}
        onPointerLeave={() => setPageDustTrail([])}
      >
        {pageDustTrail.map((dust) => (
          <motion.span
            key={`page-pointer-dust-${dust.id}`}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full z-[15]"
            style={{
              left: dust.x,
              top: dust.y,
              width: dust.size,
              height: dust.size,
              background: "rgba(238, 247, 244, 0.72)",
              boxShadow: "0 0 10px rgba(210, 236, 232, 0.45)",
              filter: "blur(0.2px)",
            }}
            initial={{ opacity: 0.55, scale: 0.6, x: -1.5, y: -1.5 }}
            animate={{ opacity: 0, scale: 1.9, y: -12 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        ))}
        <div
          ref={heroSectionRef}
          className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-visible"
        >
        <motion.section
          style={{ opacity: heroSectionOpacity, y: heroSectionY }}
          className="w-full min-h-[88vh] flex flex-col items-center justify-center overflow-visible"
        >
          <motion.div
            className="relative z-10 w-full max-w-[1480px] mx-auto min-h-[70vh] sm:min-h-[76vh] px-2 sm:px-8 md:px-12 lg:px-20 py-14 sm:py-18 md:py-20 flex flex-col items-center justify-center text-center overflow-visible"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
              const py = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
              setHeroPointer((prev) => ({
                x: prev.x * 0.82 + px * 0.18,
                y: prev.y * 0.82 + py * 0.18,
              }));
            }}
            onMouseLeave={() => {
              setHeroPointer({ x: 0, y: 0 });
            }}
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-10%] top-[10%] h-[55%]"
              style={{
                background:
                  "radial-gradient(ellipse at 20% 50%, rgba(0,212,170,0.22) 0%, rgba(0,212,170,0.06) 36%, transparent 70%), radial-gradient(ellipse at 72% 40%, rgba(34,211,238,0.20) 0%, rgba(34,211,238,0.05) 34%, transparent 70%)",
                filter: "blur(22px)",
                mixBlendMode: "screen",
              }}
              animate={{
                x: [-34, 22, -14, 28, -34],
                y: [0, -8, 5, -4, 0],
                opacity: [0.2, 0.38, 0.24, 0.34, 0.2],
                scale: [0.98, 1.03, 1],
              }}
              transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-4%] bottom-[12%] h-[28%]"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 32%, transparent 68%), radial-gradient(ellipse at 75% 46%, rgba(0,212,170,0.14) 0%, rgba(0,212,170,0.03) 34%, transparent 72%)",
                filter: "blur(20px)",
              }}
              animate={{ x: [12, -10, 8], opacity: [0.16, 0.3, 0.2] }}
              transition={{ duration: 8.6, ease: "easeInOut", repeat: Infinity }}
            />
            {heroDustSpecs.map((spec) => (
              <motion.span
                key={`hero-dust-${spec.id}`}
                aria-hidden="true"
                className="pointer-events-none absolute rounded-full"
                style={{
                  left: spec.left,
                  top: spec.top,
                  width: spec.size,
                  height: spec.size,
                  background: "rgba(232,245,247,0.68)",
                  boxShadow: "0 0 10px rgba(0,212,170,0.45)",
                  filter: "blur(0.25px)",
                }}
                animate={{
                  y: [0, -14, -2, 0],
                  x: [0, spec.drift * 0.45, spec.drift],
                  opacity: [0.08, 0.52, 0.24, 0.08],
                }}
                transition={{
                  duration: spec.duration,
                  delay: spec.delay,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              />
            ))}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 w-[125%] h-[34%] sm:h-[30%]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, rgba(0,212,170,0.10) 26%, rgba(0,0,0,0.20) 60%, transparent 76%)",
                filter: "blur(13px)",
              }}
              animate={{ opacity: [0.14, 0.34, 0.22], scale: [0.97, 1.04, 1] }}
              transition={{ duration: 4.2, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-[30%] top-[60%] w-[38%] h-[20%]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.07) 0%, rgba(0,212,170,0.08) 32%, transparent 72%)",
                filter: "blur(14px)",
              }}
              animate={{ x: [-8, 12, -4], y: [6, -5, 3], opacity: [0.1, 0.24, 0.12] }}
              transition={{ duration: 6.2, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute right-[26%] top-[58%] w-[32%] h-[18%]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, rgba(34,211,238,0.08) 34%, transparent 72%)",
                filter: "blur(14px)",
              }}
              animate={{ x: [10, -8, 6], y: [4, -6, 2], opacity: [0.08, 0.2, 0.1] }}
              transition={{ duration: 5.8, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-8%] top-[34%] h-[46%]"
              style={{
                background:
                  "radial-gradient(ellipse at 28% 48%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 26%, transparent 62%), radial-gradient(ellipse at 66% 52%, rgba(220,245,255,0.10) 0%, rgba(220,245,255,0.03) 30%, transparent 66%)",
                filter: "blur(18px)",
                mixBlendMode: "screen",
              }}
              animate={{
                x: [-36, 28, -12, 20, -36],
                y: [0, -8, 6, -4, 0],
                opacity: [0.12, 0.28, 0.16, 0.24, 0.12],
              }}
              transition={{ duration: 11.5, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-[-4%] top-[16%] h-[68%] w-[18%]"
              style={{
                background:
                  "radial-gradient(ellipse at 20% 50%, rgba(0,212,170,0.16) 0%, rgba(0,212,170,0.06) 34%, transparent 72%)",
                filter: "blur(24px)",
              }}
              animate={{ x: [-8, 6, -4], opacity: [0.2, 0.34, 0.24] }}
              transition={{ duration: 8.4, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute right-[-4%] top-[18%] h-[66%] w-[18%]"
              style={{
                background:
                  "radial-gradient(ellipse at 80% 50%, rgba(34,211,238,0.16) 0%, rgba(34,211,238,0.06) 34%, transparent 72%)",
                filter: "blur(24px)",
              }}
              animate={{ x: [8, -6, 4], opacity: [0.18, 0.3, 0.2] }}
              transition={{ duration: 8.9, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div
              style={{ scale: heroSectionScale, filter: heroSectionFilter, transformOrigin: "50% 50%" }}
              className="w-full flex flex-col items-center"
            >
            <motion.p
              className="mb-7 text-2xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.24em] text-primary/95 font-bold"
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.72, ease: "easeOut", delay: 0.08 }}
            >
              {brandLetters.map((ch, i) => (
                <motion.span
                  key={`brand-${ch}-${i}`}
                  className="inline-block"
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{
                    opacity: [0, 1, 1],
                    y: [20, -1, 0],
                    filter: ["blur(8px)", "blur(0px)", "blur(0px)"],
                    textShadow: [
                      "0 0 0 rgba(0,212,170,0)",
                      "0 0 20px rgba(0,212,170,0.95), 0 0 48px rgba(0,212,170,0.6)",
                      "0 0 12px rgba(0,212,170,0.5)",
                    ],
                  }}
                  transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 + i * 0.045 }}
                >
                  {ch}
                </motion.span>
              ))}
            </motion.p>
            <motion.h1
              className="relative text-[clamp(3.00rem,15.0vw,6.00rem)] sm:text-7xl md:text-8xl lg:text-9xl xl:text-[9.25rem] 2xl:text-[10.5rem] font-display uppercase leading-[0.98] sm:leading-[0.9] tracking-[0.01em] sm:tracking-[0.03em] text-white mb-8 will-change-transform whitespace-nowrap"
              style={{ x: heroPointer.x * 6, y: heroPointer.y * 5 }}
              animate={{ y: [heroPointer.y * 5, heroPointer.y * 5 - 3, heroPointer.y * 5] }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
              whileTap={{ scale: 0.992 }}
            >
              {conquerLetters.map((ch, i) => {
                const isGlowWord = i >= 8;
                return (
                  <motion.span
                    key={`conquer-${ch}-${i}`}
                    className="relative inline-block"
                    initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                    animate={{
                      opacity: [0, 1],
                      y: [24, -2, 0],
                      filter: ["blur(8px)", "blur(0px)", "blur(0px)"],
                      textShadow: isGlowWord
                        ? [
                            "0 0 0 rgba(0,212,170,0)",
                            "0 0 21px rgba(0,212,170,1), 0 0 52px rgba(0,212,170,0.62)",
                            "0 0 13px rgba(0,212,170,0.48)",
                          ]
                        : [
                            "0 0 0 rgba(255,255,255,0)",
                            "0 0 16px rgba(255,255,255,0.55)",
                            "0 0 6px rgba(255,255,255,0.18)",
                          ],
                    }}
                    transition={{ duration: 1.08, ease: "easeOut", delay: 1.2 + i * 0.07 }}
                  >
                    <motion.span
                      className={`inline-block ${isGlowWord ? "text-primary" : "text-white"}`}
                      onMouseEnter={() => {
                        if (ch === " ") return;
                        setHoveredConquerLetterIdx(i);
                      }}
                      onMouseLeave={() => {
                        if (hoveredConquerLetterIdx === i) setHoveredConquerLetterIdx(null);
                      }}
                      animate={{
                        opacity: [1, 0.72, 1, 0.82, 1, 0.9, 1],
                        textShadow: isGlowWord
                          ? [
                              "0 0 10px rgba(0,212,170,0.46)",
                              "0 0 4px rgba(0,212,170,0.2)",
                              "0 0 18px rgba(0,212,170,0.7)",
                              "0 0 7px rgba(0,212,170,0.3)",
                              "0 0 15px rgba(0,212,170,0.62)",
                              "0 0 9px rgba(0,212,170,0.36)",
                              "0 0 12px rgba(0,212,170,0.5)",
                            ]
                          : [
                              "0 0 5px rgba(255,255,255,0.15)",
                              "0 0 1px rgba(255,255,255,0.06)",
                              "0 0 8px rgba(255,255,255,0.26)",
                              "0 0 2px rgba(255,255,255,0.1)",
                              "0 0 7px rgba(255,255,255,0.22)",
                              "0 0 3px rgba(255,255,255,0.12)",
                              "0 0 5px rgba(255,255,255,0.15)",
                            ],
                      }}
                      transition={{
                        duration: 2.2,
                        ease: "easeInOut",
                        delay: 2.6 + i * 0.05,
                        repeat: Infinity,
                        repeatDelay: 1.1,
                      }}
                    >
                      {ch === " " ? "\u00A0" : ch}
                    </motion.span>
                    {hoveredConquerLetterIdx === i && ch !== " " && (
                      <span
                        key={`conquer-letter-dust-${i}`}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-[100%] -translate-x-1/2 w-[210%] h-[320px] overflow-visible"
                      >
                        {Array.from({ length: 18 }).map((_, p) => {
                          const xStart = ((p % 6) - 2.5) * 6.2;
                          const drift = ((p % 9) - 4) * 5.6;
                          const size = 1.8 + (p % 4) * 0.8;
                          const fall = 170 + (p % 6) * 28;
                          const duration = 1.1 + (p % 5) * 0.2;
                          const delay = (p % 9) * 0.13;
                          return (
                            <motion.span
                              key={`conquer-letter-particle-${i}-${p}`}
                              className="absolute left-1/2 rounded-sm"
                              style={{
                                top: 0,
                                width: size,
                                height: size * 0.74,
                                background: "rgba(226,232,236,0.82)",
                                filter: "blur(0.2px)",
                              }}
                              initial={{ x: xStart, y: 0, opacity: 0 }}
                              animate={{
                                x: [xStart, xStart + drift * 0.5, xStart + drift],
                                y: [0, fall * 0.42, fall],
                                opacity: [0, 0.95, 0.56, 0],
                                rotate: [0, (p % 2 === 0 ? 18 : -18), 32],
                              }}
                              transition={{
                                duration,
                                delay,
                                ease: "easeOut",
                                repeat: Infinity,
                                repeatDelay: 0,
                              }}
                            />
                          );
                        })}
                      </span>
                    )}
                  </motion.span>
                );
              })}
            </motion.h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-10 sm:mb-12 max-w-4xl leading-relaxed">
            The ultimate companion for climbers. Track your sessions, visualize your progress, find buddies, and convert grades with ease. 
          </p>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-4 sm:gap-5">
            <Link href="/sessions" className="w-full max-w-[21rem] sm:w-auto">
              <Button className="gap-2 w-full sm:w-auto min-h-9 sm:min-h-10 px-4 sm:px-6 text-sm sm:text-base">
                  Log Your Session
                </Button>
              </Link>
              <Link href="/partners" className="w-full max-w-[21rem] sm:w-auto">
                <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-9 sm:min-h-10 px-4 sm:px-6 text-sm sm:text-base">
                  Find Partner
              </Button>
            </Link>
            <Link href="/gyms" className="w-full max-w-[21rem] sm:w-auto">
              <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-9 sm:min-h-10 px-4 sm:px-6 text-sm sm:text-base">
                Explore Gyms
              </Button>
            </Link>
          </div>
            <motion.div
              className="hidden lg:block mt-14 text-[11px] text-primary/55 font-light tracking-[0.3em] uppercase pointer-events-none"
              animate={{ opacity: [0.35, 0.95, 0.45], y: [0, 3, 0] }}
              transition={{ duration: 1.7, ease: "easeInOut", repeat: Infinity }}
            >
              scroll down
            </motion.div>
            </motion.div>
          </motion.div>
        </motion.section>
        </div>

      <motion.div
        ref={featureBoulderSectionRef}
        className="overflow-visible w-full min-h-[92vh] max-w-[min(1860px,calc(100vw-0.25rem))] md:max-w-[min(1860px,calc(100vw-5.5rem))] mx-auto px-0 sm:px-6 md:px-10 lg:px-14 xl:px-18 2xl:px-20 flex items-center"
        style={{ opacity: featureSectionOpacity, y: featureSectionY, filter: featureSectionFilter }}
      >
        <div className="relative overflow-visible w-full py-7 sm:py-9">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={`feature-bg-spec-${i}`}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full -z-10"
            style={{
              left: `${6 + ((i * 11) % 88)}%`,
              top: `${10 + ((i * 17) % 74)}%`,
              width: 1.5 + (i % 4) * 1.1,
              height: 1.5 + (i % 4) * 1.1,
              background: "rgba(220,245,245,0.55)",
              boxShadow: "0 0 8px rgba(0,212,170,0.35)",
              filter: "blur(0.2px)",
            }}
            animate={{
              y: [0, -10 - (i % 5) * 2, 0],
              x: [0, (i % 2 === 0 ? 6 : -6), 0],
              opacity: [0.08, 0.42, 0.1],
            }}
            transition={{
              duration: 4.8 + (i % 6) * 0.55,
              delay: (i % 7) * 0.2,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        ))}
        <div className="text-center mb-6">
          <p className="text-xs sm:text-sm uppercase tracking-[0.22em] text-primary/80">Feature Boulder</p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-6xl uppercase tracking-[0.06em] mt-2 leading-[0.95]">
            Tap a hold to view feature
          </h2>
        </div>

        <div className="overflow-visible grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] gap-6 sm:gap-8 lg:gap-28 xl:gap-32 items-center">
          <div className="relative flex flex-col items-center lg:items-start overflow-visible py-4 sm:py-6 lg:pr-20 xl:pr-24" style={{ perspective: "900px" }}>
            <motion.div
              onPointerDownCapture={handleBoulderPointerDown}
              style={{ rotateX: boulderRotateX, rotateY: boulderRotateY, transformStyle: "preserve-3d" }}
              className={`relative w-[20rem] h-[16rem] sm:w-[24rem] sm:h-[18rem] md:w-[30rem] md:h-[22rem] lg:w-[20.5rem] lg:h-[16rem] xl:w-[24rem] xl:h-[18.5rem] 2xl:w-[30rem] 2xl:h-[22rem] touch-none select-none ${isBoulderDragging ? "cursor-grabbing" : "cursor-grab"}`}
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
                  className={`absolute z-[1200] overflow-visible -translate-x-1/2 -translate-y-1/2 ${isBoulderDragging ? "pointer-events-none" : "pointer-events-auto cursor-pointer"}`}
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
                        className="pointer-events-none absolute left-1/2 top-1/2 z-[2000] overflow-visible"
                        style={{ marginLeft: 6, marginTop: -40 }}
                      >
                        <motion.span
                          key={`quiz-surprise-drill-${quizSurpriseNonce}`}
                          aria-hidden="true"
                          className="relative block"
                          style={{
                            width: 168,
                            height: 80,
                            background: "transparent",
                            transformOrigin: "6px 40px",
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
                              width: 56,
                              height: 8,
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
                              left: 48,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 92,
                              height: 32,
                              background: "#111111",
                              borderRadius: "16px 24px 24px 16px",
                            }}
                          />

                          {/* Handle — shorter grip so top doesn't poke out */}
                          <span
                            aria-hidden="true"
                            className="absolute"
                            style={{
                              left: 104,
                              top: 22,
                              width: 32,
                              height: 76,
                              background: "#111111",
                              borderRadius: "0 0 18px 18px",
                              opacity: 0.9,
                            }}
                          />
                        </motion.span>
                      </span>
                      <motion.span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 z-[1900] -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                          width: 44,
                          height: 44,
                          background:
                            "radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 34%, rgba(0,212,170,0.26) 62%, rgba(34,211,238,0.14) 78%, rgba(0,0,0,0) 100%)",
                          boxShadow:
                            "0 0 16px rgba(0,212,170,0.38), 0 0 32px rgba(34,211,238,0.18)",
                          filter: "blur(0.25px)",
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: [0, 0, 0.42, 0.2, 0.42], scale: [0.9, 0.9, 1.08, 1, 1.08] }}
                        transition={{
                          duration: 3.2,
                          delay: 9.8,
                          ease: "easeInOut",
                          repeat: Infinity,
                          repeatDelay: 0.6,
                        }}
                      />
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
            className="group relative block justify-self-stretch min-w-0 overflow-hidden w-[calc(100%-0.75rem)] sm:w-full max-w-none mx-auto sm:mx-0 lg:ml-14 xl:ml-16 rounded-xl border border-transparent bg-transparent p-4 sm:p-6 text-left cursor-pointer transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{
              boxShadow:
                "inset 0 0 0 1px rgba(0,212,170,0.05), inset 0 0 28px rgba(0,212,170,0.06)",
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
                <p className="text-sm sm:text-sm uppercase tracking-[0.22em] text-muted-foreground">Now showing</p>
                <span className="flex items-center gap-1 text-sm sm:text-sm font-medium text-primary opacity-90 group-hover:opacity-100 shrink-0">
                  Open
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <div className="relative">
                <h3 className="font-display text-2xl sm:text-3xl md:text-3xl uppercase tracking-[0.045em] mt-2 pr-2 leading-[0.95]">
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
              <p className="text-sm sm:text-sm md:text-base lg:text-sm xl:text-base text-muted-foreground mt-3 leading-relaxed max-w-4xl">
                {FEATURE_ITEMS[activeFeatureIdx]?.desc}
              </p>
            </div>
          </Link>
        </div>
        <motion.div
          className="hidden lg:block mt-6 text-center text-[11px] text-primary/55 font-light tracking-[0.3em] uppercase pointer-events-none"
          animate={{ opacity: [0.35, 0.95, 0.45], y: [0, 3, 0] }}
          transition={{ duration: 1.7, ease: "easeInOut", repeat: Infinity }}
        >
          scroll down
        </motion.div>
      </div>
      </motion.div>

      <motion.div
        ref={quizSectionRef}
        className="mt-6 sm:mt-8 relative left-1/2 w-screen -translate-x-1/2"
        style={{ opacity: quizSectionOpacity, y: quizSectionY, filter: quizSectionFilter }}
      >
        <div className="relative w-full min-h-[74vh] py-8 sm:py-10 md:py-11 overflow-visible">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-y-16 inset-x-0"
            style={{
              opacity: quizGradientOpacity,
              background:
                "radial-gradient(circle at 12% 8%, rgba(0,212,170,0.1), transparent 50%), radial-gradient(circle at 88% 92%, rgba(34,211,238,0.08), transparent 54%), linear-gradient(120deg, rgba(0,212,170,0.04) 0%, rgba(34,211,238,0.02) 35%, rgba(0,212,170,0.032) 70%, rgba(34,211,238,0.016) 100%)",
              backgroundSize: "100% 100%, 100% 100%, 180% 180%",
              backgroundPosition: quizGradientBackgroundPosition,
              filter: "blur(6px)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
            }}
          />
          <div className="relative z-10 max-w-6xl mx-auto px-5 py-3 sm:p-6 md:p-8">
          {resultType ? (
            <motion.div
              className="mb-4 sm:mb-5 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-primary/75"
              animate={{ y: [0, -4, 0], opacity: [0.55, 1, 0.65] }}
              transition={{ duration: 1.7, ease: "easeInOut", repeat: Infinity }}
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Scroll up to see a surprise!</span>
            </motion.div>
          ) : null}
          <p className="text-xs sm:text-sm uppercase tracking-[0.22em] text-primary/80">Vibe Check</p>
          <div className="mt-1 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-[0.06em] mt-1 leading-[0.95]">
                What type of climber are you?
              </h2>
              <p className="mt-2 sm:hidden text-xs uppercase tracking-widest text-muted-foreground">
                {resultType ? "Done" : `${quizStarted ? Math.min(quizStep + 1, AXES.length) : 0}/${AXES.length}`}
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Progress</p>
              <p className="font-display text-3xl mt-1 text-primary/90">
                {resultType ? "Done" : `${quizStarted ? Math.min(quizStep + 1, AXES.length) : 0}/${AXES.length}`}
              </p>
            </div>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 via-cyan-300/80 to-primary/70"
              animate={{ width: `${resultType ? 100 : quizStarted ? Math.round((Math.min(quizStep + 1, AXES.length) / AXES.length) * 100) : 0}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {!resultType && !quizStarted ? (
            <div className="mt-4 rounded-2xl border border-primary/25 bg-[linear-gradient(160deg,rgba(0,212,170,0.12),rgba(34,211,238,0.04)_48%,rgba(0,0,0,0.28))] p-5 sm:p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_12px_40px_rgba(0,212,170,0.08)] backdrop-blur-sm">
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Answer {AXES.length} fun questions and get your Cragmate climber type.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    setQuizStarted(true);
                    setQuizStep(0);
                  }}
                  className="min-w-[148px] shadow-[0_0_24px_rgba(0,212,170,0.28)]"
                >
                  Start Quiz
                </Button>
              </div>
            </div>
          ) : !resultType && currentAxis ? (
            <>
              <div className="mt-4 rounded-2xl border border-primary/25 bg-[linear-gradient(165deg,rgba(0,0,0,0.3),rgba(0,212,170,0.08)_52%,rgba(0,0,0,0.24))] p-4 sm:p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_10px_34px_rgba(0,212,170,0.1)] backdrop-blur-sm">
                <p className="font-display text-xl sm:text-2xl leading-snug">{currentAxis.question}</p>

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
                    className="justify-start text-left h-auto min-h-14 py-3.5 px-3.5 sm:px-4 text-sm leading-snug whitespace-normal break-words border-primary/35 bg-background/80 hover:bg-primary/12 hover:border-primary/70 hover:-translate-y-[1px] transition-all duration-200"
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
                    className="justify-start text-left h-auto min-h-14 py-3.5 px-3.5 sm:px-4 text-sm leading-snug whitespace-normal break-words shadow-[0_0_24px_rgba(0,212,170,0.24)] hover:-translate-y-[1px] transition-transform duration-200"
                  >
                    {currentAxis.b.label}
                  </Button>
                </div>
                <div className="mt-4 flex justify-start">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (quizStep <= 0) return;
                      setQuizStep((s) => Math.max(0, s - 1));
                    }}
                    disabled={quizStep <= 0}
                  >
                    Back
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-primary/25 bg-[linear-gradient(165deg,rgba(0,212,170,0.1),rgba(34,211,238,0.08)_45%,rgba(0,0,0,0.25))] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_12px_36px_rgba(0,212,170,0.12)] backdrop-blur-sm">
              <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-primary/90">Your result</p>
              <p className="font-display text-3xl sm:text-4xl mt-2 text-primary drop-shadow-[0_0_10px_rgba(0,212,170,0.15)] break-words">
                The {resultType}
              </p>
              {resultBlurb ? (
                <p className="text-muted-foreground mt-3 leading-relaxed text-sm sm:text-base">{resultBlurb}</p>
              ) : null}
              <div className="mt-5">
                 <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedQuestionIndices(shuffleAndPickN(QUIZ_QUESTION_BANK.length, QUIZ_LENGTH));
                    setQuizStep(0);
                    setQuiz({});
                    setResultType(null);
                    setQuizStarted(false);
                    window.localStorage.removeItem(QUIZ_STORAGE_KEY);
                  }}
                >
                  Retake Quiz
                </Button>
              </div>
            </div>
          )}
      </div>
            </div>
      </motion.div>
      <button
        type="button"
        onClick={() => setBeginnerPopupOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/85 px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary shadow-[0_0_20px_rgba(0,212,170,0.18)] backdrop-blur-sm hover:bg-background transition-colors"
      >
        <Compass className="w-4 h-4" />
        New to climbing ? 
      </button>

      <Dialog open={beginnerPopupOpen} onOpenChange={setBeginnerPopupOpen} title="First time climbing?">
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Start with the beginner checklist and quick technique tips.
          </p>
          <Link href="/beginner">
            <Button className="w-full" size="lg" onClick={() => setBeginnerPopupOpen(false)}>
              Open beginner guide <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
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
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-primary/25 bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Your email"
            className="w-full rounded-md border border-primary/25 bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <input
            value={contactTopic}
            onChange={(e) => setContactTopic(e.target.value)}
            placeholder="Topic (e.g. Collab, Sponsorship, Feedback)"
            className="w-full rounded-md border border-primary/25 bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
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
