import { Layout } from "@/components/layout";
import { Card, Button } from "@/components/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, Compass, Shield } from "lucide-react";
import { useState } from "react";

type HoldType = {
  id: "jug" | "crimp-edge" | "sloper" | "pinch" | "pocket" | "sidepull" | "undercling" | "gaston" | "volume";
  name: string;
  short: string;
  tip: string;
};

const HOLD_TYPES: HoldType[] = [
  { id: "jug", name: "Jug", short: "Big positive hold", tip: "Use these to rest and reset breathing." },
  { id: "crimp-edge", name: "Crimp / Edge", short: "Thin edge for fingertips", tip: "Use feet more so fingers stay fresh." },
  { id: "sloper", name: "Sloper", short: "Rounded hold with low positivity", tip: "Keep hips close and press down." },
  { id: "pinch", name: "Pinch", short: "Squeeze with thumb and fingers", tip: "Stay tight through core and shoulders." },
  { id: "pocket", name: "Pocket", short: "Hole hold for 1 to 3 fingers", tip: "Load fingers gradually and avoid yanking." },
  { id: "sidepull", name: "Sidepull", short: "Side facing hold", tip: "Lean opposite and drive through feet." },
  { id: "undercling", name: "Undercling", short: "Grab from below", tip: "Push feet hard and stand up into it." },
  { id: "gaston", name: "Gaston", short: "Outward press hold", tip: "Elbow out and keep body tension." },
  { id: "volume", name: "Volume", short: "Large wall feature", tip: "Treat it like a surface not just an edge." },
];

export default function Beginner() {
  const [activeHoldId, setActiveHoldId] = useState<HoldType["id"]>("jug");
  const activeHold = HOLD_TYPES.find((h) => h.id === activeHoldId) ?? HOLD_TYPES[0];

  function renderHoldOutline(id: HoldType["id"]) {
    return (
      <svg viewBox="0 0 120 60" className="w-32 h-16 text-primary/90" aria-hidden="true">
        {id === "jug" && (
          <>
            <path d="M16 34 C20 16, 42 10, 62 10 C84 10, 103 18, 104 32 C104 44, 88 50, 63 50 C36 50, 18 44, 16 34 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M30 30 C44 22, 76 22, 90 30" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </>
        )}
        {id === "crimp-edge" && (
          <>
            <path d="M14 34 L104 24 L102 34 L16 44 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M20 31 L98 23" fill="none" stroke="currentColor" strokeWidth="2" />
          </>
        )}
        {id === "sloper" && (
          <path d="M14 40 C24 18, 96 16, 106 38 C92 48, 28 50, 14 40 Z" fill="none" stroke="currentColor" strokeWidth="3" />
        )}
        {id === "pinch" && (
          <>
            <path d="M42 12 C34 20, 34 40, 42 48" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M78 12 C86 20, 86 40, 78 48" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M42 12 L78 12 M42 48 L78 48" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M48 30 L72 30" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </>
        )}
        {id === "pocket" && (
          <>
            <path d="M18 34 C20 18, 38 10, 60 10 C82 10, 100 18, 102 34 C98 46, 82 50, 60 50 C36 50, 20 46, 18 34 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <ellipse cx="60" cy="32" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="3" />
          </>
        )}
        {id === "sidepull" && (
          <>
            <path d="M22 12 L88 18 L100 30 L88 44 L22 50 L14 30 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M30 22 L78 18" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M28 34 L76 30" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </>
        )}
        {id === "undercling" && (
          <>
            <path d="M18 34 C28 22, 88 22, 102 34 L92 46 C80 42, 40 42, 26 46 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M26 34 L94 34" fill="none" stroke="currentColor" strokeWidth="3" />
          </>
        )}
        {id === "gaston" && (
          <>
            <path d="M30 10 L92 18 L102 30 L92 44 L30 50 L20 30 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M76 16 C84 22, 84 38, 76 44" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M46 20 L72 18" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </>
        )}
        {id === "volume" && (
          <>
            <path d="M20 46 L34 16 L86 12 L100 38 L72 50 L30 50 Z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M34 16 L72 50 M86 12 L30 50" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </>
        )}
      </svg>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:underline font-semibold uppercase tracking-wider text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-widest mb-2 leading-tight">
          For the First Timers
        </h1>
      </div>

      <Card className="mb-8 p-5 sm:p-8 border-primary/20 bg-card/60">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6 text-primary" />
          </div>

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/80 mb-2">Start Here</p>
            <h3 className="text-2xl sm:text-3xl font-display uppercase tracking-wider mb-1 leading-snug">
              Your Beginner Checklist!
            </h3>
            <p className="text-sm text-muted-foreground">Run through these before your first session starts.</p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border/80 p-4 bg-background/35">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-bold">1</span>
                  <div className="font-semibold text-foreground text-sm sm:text-base">Gear</div>
                </div>
                <div className="text-muted-foreground text-sm leading-relaxed">Shoes, chalk, water, towel.</div>
              </div>
              <div className="rounded-lg border border-border/80 p-4 bg-background/35">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-bold">2</span>
                  <div className="font-semibold text-foreground text-sm sm:text-base">Warm up</div>
                </div>
                <div className="text-muted-foreground text-sm leading-relaxed">5-10 mins easy movement.</div>
              </div>
              <div className="rounded-lg border border-border/80 p-4 bg-background/35">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-bold">3</span>
                  <div className="font-semibold text-foreground text-sm sm:text-base">Climb easy</div>
                </div>
                <div className="text-muted-foreground text-sm leading-relaxed">Start with VB-V2 routes.</div>
              </div>
              <div className="rounded-lg border border-border/80 p-4 bg-background/35">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-bold">4</span>
                  <div className="font-semibold text-foreground text-sm sm:text-base">Cool down</div>
                </div>
                <div className="text-muted-foreground text-sm leading-relaxed">Light stretch.</div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link href="/sessions" className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Log your first session
                </Button>
              </Link>
              <Link href="/gyms?beginners=1" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  Explore beginner-friendly gyms
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-2xl sm:text-3xl font-display uppercase tracking-wider leading-snug">Technique Mini Guides</h3>
          </div>
          <Accordion type="single" collapsible>
            <AccordionItem value="footwork">
              <AccordionTrigger className="text-left text-lg sm:text-xl font-display uppercase tracking-wide">Quiet Feet First</AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-2">
                Place your feet deliberately and quietly. Most beginner falls come from rushed foot placement, not weak arms.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="body-position">
              <AccordionTrigger className="text-left text-lg sm:text-xl font-display uppercase tracking-wide">Use Hips, Not Just Arms</AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-2">
                Keep hips close to the wall, straighten arms when possible, and push from legs to reduce pump.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="resting">
              <AccordionTrigger className="text-left text-lg sm:text-xl font-display uppercase tracking-wide">Rest Between Attempts</AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-2">
                Rest 2-3 minutes for harder tries. Quality attempts beat repeated rushed attempts.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="falling">
              <AccordionTrigger className="text-left text-lg sm:text-xl font-display uppercase tracking-wide">Safe Falling Basics</AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-2">
                Land with bent knees, avoid reaching back with hands, and step away from the wall after landing.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-2xl sm:text-3xl font-display uppercase tracking-wider leading-snug">Climbing Glossary</h3>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="beta">
              <AccordionTrigger className="text-left text-lg sm:text-xl font-display uppercase tracking-wide">Beta</AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-2">
                Suggested sequence/method to complete a climb.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="flash">
              <AccordionTrigger className="text-left text-lg sm:text-xl font-display uppercase tracking-wide">Flash</AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-2">
                Sending on your first try!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="project">
              <AccordionTrigger className="text-left text-lg sm:text-xl font-display uppercase tracking-wide">Project</AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-2">
                A climb you work on over multiple attempts or sessions.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="slab-overhang">
              <AccordionTrigger className="text-left text-lg sm:text-xl font-display uppercase tracking-wide">Slab / Overhang</AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-2">
                Slab leans less than vertical (balance-heavy). Overhang leans out (core + pulling heavy).
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      <Card className="p-6 sm:p-7 mb-10">
        <Accordion type="single" collapsible>
          <AccordionItem value="hold-types-recognition">
            <AccordionTrigger className="text-left">
              <span className="inline-flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-2xl sm:text-3xl font-display uppercase tracking-wider leading-snug">Hold Types</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <p className="text-muted-foreground leading-relaxed mb-4">
                Tap a hold type to train visual recognition.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {HOLD_TYPES.map((hold) => (
                  <button
                    key={hold.id}
                    type="button"
                    onClick={() => setActiveHoldId(hold.id)}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${
                      activeHoldId === hold.id
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background/40 text-foreground/90 hover:border-primary/40"
                    }`}
                  >
                    {hold.name}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-border p-4 sm:p-5 bg-background/40">
                <div className="mb-3 h-20 rounded-md border border-primary/30 bg-primary/5 flex items-center justify-center">
                  {renderHoldOutline(activeHold.id)}
                </div>
                <div className="font-semibold text-foreground text-lg">{activeHold.name}</div>
                <div className="text-muted-foreground mt-1 text-sm leading-relaxed">{activeHold.short}</div>
                <div className="text-muted-foreground mt-1 text-sm leading-relaxed">{activeHold.tip}</div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </Layout>
  );
}

