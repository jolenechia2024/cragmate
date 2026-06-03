import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { Card, Button, Input } from "@/components/ui";
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
} from "lucide-react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { askBeginnerCoach } from "@/lib/ai-api";
import { cn } from "@/lib/utils";
import { HOLD_TYPES, type HoldTypeId } from "@/lib/hold-types";
import { HoldTypeDetail } from "@/components/hold-type-display";

const SECTION_TRIGGER =
  "text-xl sm:text-2xl font-display uppercase tracking-wider text-foreground hover:no-underline py-5 sm:py-6";

const CHECKLIST = [
  { icon: Backpack, label: "Pack", detail: "Shoes, chalk, water" },
  { icon: Flame, label: "Warm up", detail: "5–10 min easy climbs" },
  { icon: Mountain, label: "Start easy", detail: "VB–V2 or gym greens" },
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

function BeginnerCoach({ holdTypeName }: { holdTypeName: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAsk = question.trim().length >= 3;

  async function handleAsk() {
    if (!canAsk || loading) return;
    setLoading(true);
    setError(null);
    try {
      const text = await askBeginnerCoach({
        question: question.trim(),
        holdType: holdTypeName,
        topic: "beginner bouldering",
      });
      setAnswer(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

    return (
    <Card className="mb-8 sm:mb-10 p-4 sm:p-6 border-primary/30 bg-card">
      <h2 className="text-xl sm:text-2xl font-display uppercase tracking-wider text-foreground mb-4">
        Cragmate AI Coach
      </h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAsk();
          }}
          placeholder="Ask about your first session…"
          className="flex-1"
          aria-label="Your question"
        />
        <Button
          type="button"
          className="shrink-0 sm:min-w-[5.5rem]"
          disabled={!canAsk || loading}
          onClick={() => void handleAsk()}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              …
            </>
          ) : (
            "Ask"
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setQuestion(q)}
            className="text-xs px-2.5 py-1 rounded-full border border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {answer && !error && (
        <div
          className="mt-4 rounded-lg border border-border/80 bg-background/50 p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap"
          role="status"
        >
          {answer}
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground/80 leading-snug">
        Friendly tips only — not medical or professional coaching. Pain or injury? Rest and see a doctor.
      </p>
    </Card>
  );
}

export default function Beginner() {
  const [activeHoldId, setActiveHoldId] = useState<HoldTypeId>("jug");
  const activeHold = HOLD_TYPES.find((h) => h.id === activeHoldId) ?? HOLD_TYPES[0]!;

  return (
    <Layout>
      <PageHeader
        title="Beginner guide"
        description="First bouldering session in Singapore? Start here."
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
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
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
