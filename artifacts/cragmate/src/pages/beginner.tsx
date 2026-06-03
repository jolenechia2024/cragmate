import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { Card, Button } from "@/components/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import {
  Backpack,
  Flame,
  Mountain,
  StretchHorizontal,
  Compass,
  BookOpen,
  Shield,
  SendHorizontal,
  User,
} from "lucide-react";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { askBeginnerCoach } from "@/lib/ai-api";
import { cn } from "@/lib/utils";
import { HOLD_TYPES, type HoldTypeId } from "@/lib/hold-types";
import { HoldTypeDetail } from "@/components/hold-type-display";

const SECTION_TRIGGER =
  "text-xl sm:text-2xl font-display uppercase tracking-wider text-foreground hover:no-underline py-5 sm:py-6";

const CHECKLIST = [
  { icon: Backpack, label: "Pack", detail: "Shoes, chalk, water" },
  { icon: Flame, label: "Warm up", detail: "5–10 min easy climbs" },
  { icon: Mountain, label: "Start easy", detail: "Easy grades or gym greens" },
  { icon: StretchHorizontal, label: "Cool down", detail: "Light stretch after" },
] as const;

const QUICK_TIPS = [
  { title: "Quiet feet", body: "Place feet before you pull. Rushed feet cause most beginner falls." },
  { title: "Hips in", body: "Stay close to the wall. Straight arms + leg push beats arm-pulling." },
  { title: "Rest", body: "Wait 2–3 min on hard climbs. One good try beats five tired ones." },
  { title: "Falling", body: "Bent knees, don't catch yourself with your hands, step clear of the wall." },
];

const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Beta", meaning: "The sequence you'd use to climb a route." },
  { term: "Send", meaning: "You finished the climb (topped out or matched)." },
  { term: "Flash", meaning: "Sent on your first try, with no prior attempts." },
  { term: "Project", meaning: "A climb you're working on over multiple tries." },
  { term: "Slab", meaning: "Less than vertical — balance and footwork." },
  { term: "Overhang", meaning: "Wall leans out — more core and pulling." },
];

const SUGGESTED_QUESTIONS = [
  "What should I wear to the gym?",
  "How hard should my first climbs be?",
  "Why do my arms get tired so fast?",
];

function softenPunctuation(text: string) {
  return text.replace(/\s*[—–]\s*/g, ". ").replace(/\.\.+/g, ".");
}

function CoachMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="35" r="21" fill="#2db892" />
      <ellipse cx="32" cy="30" rx="14" ry="10" fill="#7ee8c4" opacity="0.35" />
      <path d="M32 12c-4 0-7 3-8 7l3 1c1-2 3-3 5-3s4 1 5 3l3-1c-1-4-4-7-8-7z" fill="#157a5c" />
      <circle cx="32" cy="13" r="2.5" fill="#8fdcc8" />
      <circle cx="25" cy="34" r="3.2" fill="#051915" />
      <circle cx="39" cy="34" r="3.2" fill="#051915" />
      <circle cx="26" cy="33" r="1" fill="#ffffff" opacity="0.9" />
      <circle cx="40" cy="33" r="1" fill="#ffffff" opacity="0.9" />
      <path d="M26 42c2.5 3 9.5 3 12 0" fill="none" stroke="#051915" strokeWidth="2" strokeLinecap="round" />
      <circle cx="19" cy="38" r="2.8" fill="#ff9eb5" opacity="0.45" />
      <circle cx="45" cy="38" r="2.8" fill="#ff9eb5" opacity="0.45" />
    </svg>
  );
}

function CoachBubble({
  children,
  className,
  tone = "default",
  ...props
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent" | "error";
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex max-w-[95%] items-end gap-3 sm:max-w-[90%]", className)} {...props}>
      <CoachMascot className="mb-1 size-10 shrink-0 sm:size-11" />
      <div
        className={cn(
          "min-w-0 flex-1 rounded-2xl rounded-bl-md px-4 py-3.5 text-sm leading-relaxed shadow-sm",
          tone === "default" && "border border-border/60 bg-background/75",
          tone === "accent" && "border border-primary/20 bg-primary/[0.08] text-foreground",
          tone === "error" && "border border-destructive/25 bg-destructive/10 text-destructive",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-full items-end justify-end gap-3">
      <div className="max-w-[85%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/12 px-4 py-3.5 text-sm leading-relaxed text-foreground shadow-sm">
        {children}
      </div>
      <UserAvatar className="mb-1" />
    </div>
  );
}

function UserAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      <User className="size-4" />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-primary/70 animate-pulse"
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
    </span>
  );
}

function BeginnerCoach({ holdTypeName }: { holdTypeName: string }) {
  const [question, setQuestion] = useState("");
  const [sentQuestion, setSentQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAsk = question.trim().length >= 3;

  async function handleAsk() {
    if (!canAsk || loading) return;
    const trimmed = question.trim();
    setSentQuestion(trimmed);
    setQuestion("");
    setAnswer(null);
    setLoading(true);
    setError(null);
    try {
      const text = await askBeginnerCoach({
        question: trimmed,
        holdType: holdTypeName,
        topic: "beginner climbing",
      });
      setAnswer(softenPunctuation(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Crag Coach</p>
      <section className="mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card shadow-[0_12px_40px_rgba(0,0,0,0.18)] sm:mb-10">
        <div className="space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-6">
        <CoachBubble>
          <p>
            Hey! Ask me anything about climbing. Gear, gym etiquette, how to read holds, what to try first.
          </p>
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground/90">
            Friendly tips only, not medical or professional coaching. Pain or injury? Rest and see a doctor.
          </p>
        </CoachBubble>

        {sentQuestion ? <UserBubble>{sentQuestion}</UserBubble> : null}

        {loading ? (
          <CoachBubble aria-live="polite">
            <TypingDots />
            <span className="sr-only">Coach is typing</span>
          </CoachBubble>
        ) : null}

        {error ? (
          <CoachBubble tone="error" role="alert">
            {error}
          </CoachBubble>
        ) : null}

        {answer && !error ? (
          <CoachBubble tone="accent" role="status">
            <p className="whitespace-pre-wrap">{answer}</p>
          </CoachBubble>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuestion(q)}
              className="rounded-full border border-border/80 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 shadow-sm transition-colors focus-within:border-primary/35">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAsk();
              }}
              placeholder="Ask about your first climb..."
              aria-label="Your question"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="button"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              disabled={!canAsk || loading}
              onClick={() => void handleAsk()}
              aria-label="Send question"
            >
              <SendHorizontal className="size-4" />
            </Button>
          </div>
        </div>
        </div>
      </section>
    </>
  );
}

export default function Beginner() {
  const [activeHoldId, setActiveHoldId] = useState<HoldTypeId>("jug");
  const activeHold = HOLD_TYPES.find((h) => h.id === activeHoldId) ?? HOLD_TYPES[0]!;

  return (
    <Layout>
      <PageHeader
        title="Beginner guide"
        description="First climbing session in Singapore? Start here."
      />

      <BeginnerCoach holdTypeName={activeHold.name} />

      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Reference guide
      </p>

      <Card className="overflow-hidden border-border/80">
        <Accordion type="multiple" defaultValue={["first-visit", "hold-types"]} className="w-full">
          <AccordionItem value="first-visit" className="border-border px-4 sm:px-6">
            <AccordionTrigger className={SECTION_TRIGGER}>
              <span className="inline-flex items-center gap-2 sm:gap-3">
                <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                Your first visit
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm sm:text-base text-muted-foreground pb-6">
              <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {CHECKLIST.map((step, i) => (
                  <li key={step.label}>
                    <div className="rounded-lg border border-border/80 p-4 h-full bg-background/35">
                      <span className="text-xs text-muted-foreground font-medium">Step {i + 1}</span>
                      <div className="flex items-center gap-2 mt-2 mb-1">
                        <step.icon className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-semibold text-foreground text-sm sm:text-base">{step.label}</span>
                </div>
                      <p className="text-sm leading-relaxed">{step.detail}</p>
              </div>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <Link href="/sessions">
                  <Button className="w-full sm:w-auto">Log a session</Button>
              </Link>
                <Link href="/gyms?beginners=1">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Find beginner gyms
                </Button>
              </Link>
            </div>
              </AccordionContent>
            </AccordionItem>

          <AccordionItem value="hold-types" className="border-border px-4 sm:px-6">
            <AccordionTrigger className={SECTION_TRIGGER}>
              <span className="inline-flex items-center gap-2 sm:gap-3">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                Hold types
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm sm:text-base text-muted-foreground pb-6">
              <p className="mb-4">Tap a hold to see what it is.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {HOLD_TYPES.map((hold) => (
                  <button
                    key={hold.id}
                    type="button"
                    onClick={() => setActiveHoldId(hold.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      activeHoldId === hold.id
                        ? "border-primary bg-primary/15 text-primary font-medium"
                        : "border-border text-foreground/90 hover:border-primary/40",
                    )}
                  >
                    {hold.name}
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
                <HoldTypeDetail holdId={activeHoldId} hold={activeHold} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="quick-tips" className="border-border px-4 sm:px-6">
            <AccordionTrigger className={SECTION_TRIGGER}>
              <span className="inline-flex items-center gap-2 sm:gap-3">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                Quick tips
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm sm:text-base text-muted-foreground pb-6">
              <ul className="space-y-3">
                {QUICK_TIPS.map((tip) => (
                  <li key={tip.title} className="rounded-lg border border-border/80 p-4 bg-background/35">
                    <p className="font-semibold text-foreground text-sm sm:text-base">{tip.title}</p>
                    <p className="mt-1 leading-relaxed">{tip.body}</p>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="glossary" className="border-border px-4 sm:px-6">
            <AccordionTrigger className={SECTION_TRIGGER}>
              <span className="inline-flex items-center gap-2 sm:gap-3">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                Words you&apos;ll hear
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm sm:text-base text-muted-foreground pb-6">
              <div className="rounded-lg border border-border/80 divide-y divide-border/80 overflow-hidden">
                {GLOSSARY.map((item) => (
                  <div key={item.term} className="px-4 py-3 flex gap-4 sm:gap-6 bg-background/35">
                    <span className="font-semibold text-primary w-20 shrink-0">{item.term}</span>
                    <span className="leading-relaxed">{item.meaning}</span>
                </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </Card>
    </Layout>
  );
}
