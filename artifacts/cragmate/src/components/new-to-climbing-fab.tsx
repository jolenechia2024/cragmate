import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Compass } from "lucide-react";
import { Button, Dialog } from "@/components/ui";
import { cn } from "@/lib/utils";

export function NewToClimbingFab() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const isHome = location === "/";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="New to climbing?"
        className={cn(
          "fixed bottom-5 right-5 z-40 inline-flex items-center justify-center rounded-full border border-primary/40 bg-background/85 text-primary shadow-[0_0_20px_rgba(0,212,170,0.18)] backdrop-blur-sm hover:bg-background transition-colors",
          isHome
            ? "gap-2 px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider"
            : "w-11 h-11 sm:w-12 sm:h-12",
        )}
      >
        <Compass className={cn(isHome ? "w-4 h-4" : "w-5 h-5")} />
        {isHome ? "New to climbing ?" : null}
      </button>

      <Dialog open={open} onOpenChange={setOpen} title="First time climbing?">
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Start with the beginner checklist and quick technique tips.
          </p>
          <Link href="/beginner">
            <Button className="w-full" size="lg" onClick={() => setOpen(false)}>
              Open beginner guide <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </Dialog>
    </>
  );
}
