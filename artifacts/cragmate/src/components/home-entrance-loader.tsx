import type { CSSProperties } from "react";

type HomeEntranceLoaderProps = {
  doorOpening: boolean;
};

/** Timings kept in sync with home.tsx loader dismiss effect. */
export const DOOR_OPEN_DELAY_MS = 900;
export const DOOR_ANIMATION_MS = 2800;
const DOOR_STAGGER_MS = 90;
export const DOOR_HOLD_AFTER_OPEN_MS = 700;
export const DOOR_LOADER_TOTAL_MS =
  DOOR_OPEN_DELAY_MS + DOOR_ANIMATION_MS + DOOR_STAGGER_MS + DOOR_HOLD_AFTER_OPEN_MS;

const DOOR_EASE = "cubic-bezier(0.33, 1, 0.68, 1)";
const LEFT_DOOR_TRANSITION = `transform ${DOOR_ANIMATION_MS}ms ${DOOR_EASE}`;
const RIGHT_DOOR_TRANSITION = `transform ${DOOR_ANIMATION_MS}ms ${DOOR_EASE} ${DOOR_STAGGER_MS}ms`;

const glassPanel: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, rgba(0,212,170,0.1) 100%)",
  backdropFilter: "blur(14px) saturate(1.2)",
  WebkitBackdropFilter: "blur(14px) saturate(1.2)",
  boxShadow: "inset 0 0 60px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.25)",
};

function GlassDoor({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0" style={glassPanel} />
      <div
        className={
          isLeft
            ? "absolute inset-[7%_5%_7%_6%] rounded-sm border border-white/25 pointer-events-none"
            : "absolute inset-[7%_6%_7%_5%] rounded-sm border border-white/25 pointer-events-none"
        }
      />
      <div
        className={
          isLeft
            ? "absolute right-[10%] top-1/2 h-[4.5rem] w-1.5 -translate-y-1/2 rounded-full bg-white/25 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
            : "absolute left-[10%] top-1/2 h-[4.5rem] w-1.5 -translate-y-1/2 rounded-full bg-white/25 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
        }
      />
      <div
        className={
          isLeft
            ? "absolute top-[12%] bottom-[12%] left-0 w-px bg-white/10"
            : "absolute top-[12%] bottom-[12%] right-0 w-px bg-white/10"
        }
      />
    </div>
  );
}

/** Cragmate Gym glass doors — swing open once per tab; home shows through underneath. */
export function HomeEntranceLoader({ doorOpening }: HomeEntranceLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden bg-background/40"
      role="dialog"
      aria-modal="true"
      aria-label="Entering Cragmate"
      style={{ perspective: "1300px" }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-[2400ms] ease-out"
        style={{
          opacity: doorOpening ? 1 : 0.5,
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,212,170,0.15) 0%, transparent 60%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center transition-[opacity,transform] ease-out"
        style={{
          opacity: doorOpening ? 0 : 1,
          transform: doorOpening ? "scale(0.98) translateY(4px)" : "scale(1) translateY(0)",
          transitionDuration: doorOpening ? "900ms" : "400ms",
          transitionDelay: doorOpening ? "200ms" : "0ms",
        }}
      >
        <div className="text-center px-6">
          <p className="font-display m-0 text-xl uppercase tracking-[0.18em] text-foreground sm:text-2xl drop-shadow-sm">
            Cragmate Gym
          </p>
          <p className="m-0 mt-3 text-[13px] uppercase tracking-[0.12em] text-muted-foreground">
            {doorOpening ? "Doors opening…" : "Approaching entrance…"}
          </p>
        </div>
      </div>

      <div className="absolute inset-0 z-[3]" style={{ transformStyle: "preserve-3d" }}>
        <div
          className="absolute left-0 top-0 h-full w-1/2 border-r border-white/15"
          style={{
            transformOrigin: "left center",
            transform: doorOpening ? "rotateY(-92deg)" : "rotateY(0deg)",
            transition: LEFT_DOOR_TRANSITION,
            backfaceVisibility: "hidden",
            willChange: "transform",
          }}
        >
          <GlassDoor side="left" />
        </div>
        <div
          className="absolute right-0 top-0 h-full w-1/2 border-l border-white/15"
          style={{
            transformOrigin: "right center",
            transform: doorOpening ? "rotateY(92deg)" : "rotateY(0deg)",
            transition: RIGHT_DOOR_TRANSITION,
            backfaceVisibility: "hidden",
            willChange: "transform",
          }}
        >
          <GlassDoor side="right" />
        </div>
      </div>
    </div>
  );
}
