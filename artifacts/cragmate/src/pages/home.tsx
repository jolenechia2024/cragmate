import { Layout } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { Link } from "wouter";
import { ArrowRight, Compass, Mountain, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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

  useEffect(() => {
    const stored = window.localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        quizStep?: number;
        quiz?: QuizState;
        resultType?: string | null;
      };

      const allowedTypes: ClimberType[] = [
        "Technician",
        "Explorer",
        "Strategist",
        "Flow Climber",
        "Motivator",
        "Grinder",
        "Risk-Taker",
        "Calm Connector",
      ];
      if (parsed?.quiz) setQuiz(parsed.quiz);

      const step = typeof parsed?.quizStep === "number" ? parsed.quizStep : 0;
      setQuizStep(Math.max(0, Math.min(step, AXES.length)));

      if (parsed?.resultType && allowedTypes.includes(parsed.resultType as ClimberType)) {
        setResultType(parsed.resultType as ClimberType);
        setQuizStep(AXES.length); // show result immediately
      } else {
        setResultType(null);
      }
    } catch {
      // ignore
    }
  }, [AXES.length]);

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
      <div className="relative rounded-2xl overflow-hidden mb-12 bg-teal-950 border border-teal-900/30 shadow-[0_0_40px_rgba(0,212,170,0.05)]">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-texture.png`} 
            alt="Rock texture" 
            className="w-full h-full object-cover opacity-15 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10 p-8 md:p-16 lg:p-24 flex flex-col items-start max-w-3xl">
          <Badge className="mb-6 border border-primary text-primary bg-primary/10 shadow-[0_0_10px_rgba(0,212,170,0.2)]">BETA ACCESS</Badge>
          <h1 className="text-6xl md:text-8xl font-display uppercase leading-[0.85] text-white mb-6">
            Conquer <br/><span className="text-primary drop-shadow-[0_0_15px_rgba(0,212,170,0.4)]">The Crag</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl font-medium">
            The ultimate companion for climbers. Track your sessions, visualize your progress, find buddies, and convert grades with ease. 
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/sessions">
              <Button size="lg" className="gap-2">
                Log Your Session <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/gyms">
              <Button size="lg" variant="outline" className="gap-2">
                Explore Gyms
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-8 rounded-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] hover:border-primary/50 transition-all duration-300 group">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Mountain className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl font-display uppercase tracking-wider mb-3">Grade Converter</h3>
          <p className="text-muted-foreground">Seamlessly translate between V-scale, Font scale, and local gym color circuits in seconds.</p>
        </div>
        <div className="bg-card border border-border p-8 rounded-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] hover:border-primary/50 transition-all duration-300 group">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl font-display uppercase tracking-wider mb-3">Track Progress</h3>
          <p className="text-muted-foreground">Log every send and attempt. Watch your top grade rise with clear data visualizations.</p>
        </div>
        <div className="bg-card border border-border p-8 rounded-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] hover:border-primary/50 transition-all duration-300 group">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl font-display uppercase tracking-wider mb-3">Find Partners</h3>
          <p className="text-muted-foreground">No belay/climbing partner? No worries. Post your planned sessions and connect with the community!</p>
        </div>
      </div>

      <div className="mt-8">
        <Card className="p-6 sm:p-8 border-primary/20 bg-card/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Mini Quiz</p>
              <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-wider mt-1 leading-tight">
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
                <p className="font-display text-2xl mt-2">{currentAxis.question}</p>

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
                    className="justify-start text-left h-auto py-3 px-4 text-sm leading-snug whitespace-normal break-words"
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
                    className="justify-start text-left h-auto py-3 px-4 text-sm leading-snug whitespace-normal break-words"
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
              <p className="font-display text-4xl mt-2 text-primary drop-shadow-[0_0_10px_rgba(0,212,170,0.15)] break-words">
                {resultType}
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

      <Card className="mt-8 p-6 border-primary/20 bg-card/60">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-display uppercase tracking-wider">First time climbing?</h3>
              <p className="text-muted-foreground mt-2">
                Click here for a beginner checklist + quick technique tips.
              </p>
            </div>
          </div>

          <Link href="/beginner">
            <Button className="shrink-0" size="lg">
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
