import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { climberTypeBlurb } from "@/lib/climber-type-blurb";
import { QUESTION_BANK, type ClimberType } from "@/lib/quiz-bank";

const QUIZ_STORAGE_KEY = "cragmate_climber_quiz_v4";
const QUIZ_LENGTH = 10;

type QuizState = Record<string, ClimberType>;

function shuffleAndPickN(total: number, n: number): number[] {
  const arr = Array.from({ length: total }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, n);
}

function computeType(axes: { key: string }[], nextQuiz: QuizState): ClimberType | "" {
  const values = axes.map((ax) => nextQuiz[ax.key]);
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

export default function QuizPage() {
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return shuffleAndPickN(QUESTION_BANK.length, QUIZ_LENGTH);
      const parsed = JSON.parse(raw) as { selectedQuestionIndices?: number[] };
      const idx = parsed.selectedQuestionIndices;
      if (Array.isArray(idx) && idx.length === QUIZ_LENGTH && idx.every((n) => typeof n === "number" && n >= 0 && n < QUESTION_BANK.length)) {
        return idx;
      }
    } catch {
      // ignore malformed storage
    }
    return shuffleAndPickN(QUESTION_BANK.length, QUIZ_LENGTH);
  });

  const axes = useMemo(
    () =>
      selectedQuestionIndices.map((idx, i) => {
        const q = QUESTION_BANK[idx];
        if (!q) {
          return { key: `q${i}`, question: "", a: { value: "Technician" as ClimberType, label: "" }, b: { value: "Technician" as ClimberType, label: "" } };
        }
        return {
          key: `q${i}`,
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

  const currentAxis = axes[quizStep] ?? null;
  const resultBlurb = useMemo(() => climberTypeBlurb(resultType), [resultType]);

  const persist = (next: { quizStep: number; quiz: QuizState; resultType: ClimberType | null; selectedQuestionIndices: number[] }) => {
    window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next));
  };

  const choose = (value: ClimberType) => {
    if (!currentAxis) return;
    const nextQuiz = { ...quiz, [currentAxis.key]: value };
    const computed = computeType(axes, nextQuiz);
    if (computed) {
      setQuiz(nextQuiz);
      setResultType(computed);
      setQuizStep(axes.length);
      persist({ quizStep: axes.length, quiz: nextQuiz, resultType: computed, selectedQuestionIndices });
      return;
    }
    const nextStep = quizStep + 1;
    setQuiz(nextQuiz);
    setQuizStep(nextStep);
    persist({ quizStep: nextStep, quiz: nextQuiz, resultType: null, selectedQuestionIndices });
  };

  const resetQuiz = () => {
    const nextIndices = shuffleAndPickN(QUESTION_BANK.length, QUIZ_LENGTH);
    setSelectedQuestionIndices(nextIndices);
    setQuizStep(0);
    setQuiz({});
    setResultType(null);
    window.localStorage.removeItem(QUIZ_STORAGE_KEY);
  };

  return (
    <Layout>
      <Card className="p-6 sm:p-8 border-primary/20 bg-card/60 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Mini Quiz</p>
            <h1 className="font-display text-2xl sm:text-4xl uppercase tracking-wider mt-1 leading-tight">
              What type of climber are you?
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              {axes.length} quick questions — get your climber type.
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Progress</p>
            <p className="font-display text-3xl mt-1">{resultType ? "Done" : `${Math.min(quizStep + 1, axes.length)}/${axes.length}`}</p>
          </div>
        </div>

        {!resultType && currentAxis ? (
          <>
            <div className="mt-6 rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm text-muted-foreground uppercase tracking-widest">
                Question {quizStep + 1} / {axes.length}
              </p>
              <p className="font-display text-xl sm:text-2xl mt-2 leading-snug">{currentAxis.question}</p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => choose(currentAxis.a.value)}
                  className="justify-start text-left h-auto min-h-14 py-3 px-3 sm:px-4 text-sm leading-snug whitespace-normal break-words"
                >
                  {currentAxis.a.label}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => choose(currentAxis.b.value)}
                  className="justify-start text-left h-auto min-h-14 py-3 px-3 sm:px-4 text-sm leading-snug whitespace-normal break-words"
                >
                  {currentAxis.b.label}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Already know your vibe? You can retake anytime.</p>
              <Button variant="ghost" onClick={resetQuiz}>Retake</Button>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-background/40 p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Your result</p>
            <p className="font-display text-3xl sm:text-4xl mt-2 text-primary drop-shadow-[0_0_10px_rgba(0,212,170,0.15)] break-words">
              The {resultType}
            </p>
            {resultBlurb ? <p className="text-muted-foreground mt-3 leading-relaxed text-sm sm:text-base">{resultBlurb}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="ghost" onClick={resetQuiz}>Retake Quiz</Button>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </Layout>
  );
}
