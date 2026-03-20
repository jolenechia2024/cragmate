import { Layout } from "@/components/layout";
import { Card, Button } from "@/components/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, Compass, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { getStreak } from "@/lib/streak";

export default function Beginner() {
  const [streak, setStreak] = useState(() => getStreak().currentStreak);

  useEffect(() => {
    const onStreak = () => setStreak(getStreak().currentStreak);
    window.addEventListener("cragmate:streak-updated", onStreak as EventListener);
    return () => window.removeEventListener("cragmate:streak-updated", onStreak as EventListener);
  }, []);

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
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
          Start with easy climbs (VB-V2), focus on movement quality, and log what you learn.
        </p>
      </div>

      <Card className="mb-8 p-6 sm:p-8 border-primary/20 bg-card/60">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6 text-primary" />
          </div>

          <div className="min-w-0">
            <h3 className="text-3xl font-display uppercase tracking-wider mb-2 leading-snug">
              Your Beginner Checklist!
            </h3>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              First session checklist: rental shoes, short warm-up, choose VB-V2 climbs, rest between attempts, and focus on foot placement over power.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-background/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Climbing streak</p>
                <p className="font-display text-2xl sm:text-3xl mt-1">
                  {streak} day{streak === 1 ? "" : "s"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {streak > 0 ? "Log a session today to keep it going." : "Log your first session to start your streak."}
                </p>
              </div>

              <Link href="/sessions">
                <Button size="lg" className="w-full sm:w-auto">
                  {streak > 0 ? "Keep streak" : "Log session"}
                </Button>
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border p-4 bg-background/40">
                <div className="font-semibold text-foreground text-sm sm:text-base">1) Gear</div>
                <div className="text-muted-foreground mt-1 text-sm sm:text-base leading-relaxed">Shoes, chalk, water, towel.</div>
              </div>
              <div className="rounded-lg border border-border p-4 bg-background/40">
                <div className="font-semibold text-foreground text-sm sm:text-base">2) Warm up</div>
                <div className="text-muted-foreground mt-1 text-sm sm:text-base leading-relaxed">5-10 mins easy movement.</div>
              </div>
              <div className="rounded-lg border border-border p-4 bg-background/40">
                <div className="font-semibold text-foreground text-sm sm:text-base">3) Climb easy</div>
                <div className="text-muted-foreground mt-1 text-sm sm:text-base leading-relaxed">Start with VB-V2 routes.</div>
              </div>
              <div className="rounded-lg border border-border p-4 bg-background/40">
                <div className="font-semibold text-foreground text-sm sm:text-base">4) Cool down</div>
                <div className="text-muted-foreground mt-1 text-sm sm:text-base leading-relaxed">Light stretch.</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/sessions">
                <Button size="lg" className="gap-2">
                  Log your first session
                </Button>
              </Link>
              <Link href="/gyms">
                <Button size="lg" variant="outline" className="gap-2">
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
              <AccordionTrigger className="text-left text-base sm:text-xl">Quiet Feet First</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base sm:text-xl leading-relaxed pb-2">
                Place your feet deliberately and quietly. Most beginner falls come from rushed foot placement, not weak arms.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="body-position">
              <AccordionTrigger className="text-left text-base sm:text-xl">Use Hips, Not Just Arms</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base sm:text-xl leading-relaxed pb-2">
                Keep hips close to the wall, straighten arms when possible, and push from legs to reduce pump.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="resting">
              <AccordionTrigger className="text-left text-base sm:text-xl">Rest Between Attempts</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base sm:text-xl leading-relaxed pb-2">
                Rest 2-3 minutes for harder tries. Quality attempts beat repeated rushed attempts.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="falling">
              <AccordionTrigger className="text-left text-base sm:text-xl">Safe Falling Basics</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base sm:text-xl leading-relaxed pb-2">
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
              <AccordionTrigger className="text-left text-base sm:text-xl">Beta</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base sm:text-xl leading-relaxed pb-2">
                Suggested sequence/method to complete a climb.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="flash">
              <AccordionTrigger className="text-left text-base sm:text-xl">Flash</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base sm:text-xl leading-relaxed pb-2">
                Sending on your first try!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="project">
              <AccordionTrigger className="text-left text-base sm:text-xl">Project</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base sm:text-xl leading-relaxed pb-2">
                A climb you work on over multiple attempts or sessions.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="slab-overhang">
              <AccordionTrigger className="text-left text-base sm:text-xl">Slab / Overhang</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base sm:text-xl leading-relaxed pb-2">
                Slab leans less than vertical (balance-heavy). Overhang leans out (core + pulling heavy).
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>
    </Layout>
  );
}

