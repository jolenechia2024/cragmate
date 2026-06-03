import { cn } from "@/lib/utils";

type HomeEntranceLoaderProps = {
  doorOpening: boolean;
  /** Home page is fading in — hide loader chrome (text, light, doors). */
  revealed?: boolean;
  /** Fade the whole overlay out before unmount. */
  exiting?: boolean;
};

export const DOOR_OPEN_DELAY_MS = 1400;
export const DOOR_ANIMATION_MS = 3600;
export const DOOR_STAGGER_MS = 120;
export const DOOR_EXIT_FADE_MS = 650;
/** Soft center glow — grows slower than the doors. */
export const LIGHT_GROW_MS = 4200;
/** Fade out title + light + doors once home starts showing. */
export const CONTENT_FADE_MS = 900;
/** When home content starts fading in. */
export const HOME_REVEAL_DELAY_MS = Math.round(DOOR_ANIMATION_MS * 0.62);

const DOOR_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const LIGHT_EASE = "cubic-bezier(0.45, 0.05, 0.25, 1)";
const DOOR_TRANSITION = `transform ${DOOR_ANIMATION_MS}ms ${DOOR_EASE}, opacity ${CONTENT_FADE_MS}ms ease-out`;
const RIGHT_DOOR_TRANSITION = `transform ${DOOR_ANIMATION_MS}ms ${DOOR_EASE} ${DOOR_STAGGER_MS}ms, opacity ${CONTENT_FADE_MS}ms ease-out ${DOOR_STAGGER_MS}ms`;
const LIGHT_GROW_TRANSITION = `transform ${LIGHT_GROW_MS}ms ${LIGHT_EASE}, opacity ${LIGHT_GROW_MS}ms ${LIGHT_EASE}`;
const LIGHT_FADE_TRANSITION = `opacity ${CONTENT_FADE_MS}ms ease-out`;
const TEXT_FADE_TRANSITION = `opacity ${CONTENT_FADE_MS}ms ease-out, transform ${CONTENT_FADE_MS}ms ease-out`;

export function HomeEntranceLoader({ doorOpening, revealed = false, exiting = false }: HomeEntranceLoaderProps) {
  const lightGrowing = doorOpening && !revealed && !exiting;
  const uiHidden = revealed || exiting;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] select-none overflow-hidden transition-opacity ease-out",
        exiting ? "pointer-events-none opacity-0" : revealed ? "pointer-events-none opacity-100" : "opacity-100",
      )}
      style={{ transitionDuration: `${DOOR_EXIT_FADE_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-label="Entering Cragmate"
      aria-live="polite"
      aria-busy={!doorOpening && !exiting}
    >
      {/* Soft teal glow in the door gap — slow ramp, never full-screen harsh */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "90vmax",
            height: "90vmax",
            transform: lightGrowing
              ? "translate(-50%, -50%) scale(0.55)"
              : "translate(-50%, -50%) scale(0.02)",
            opacity: uiHidden ? 0 : lightGrowing ? 0.28 : 0,
            transition: uiHidden ? LIGHT_FADE_TRANSITION : LIGHT_GROW_TRANSITION,
            background:
              "radial-gradient(circle, rgba(0,212,170,0.16) 0%, rgba(0,212,170,0.07) 38%, transparent 68%)",
            filter: "blur(18px)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "48vmax",
            height: "48vmax",
            transform: lightGrowing
              ? "translate(-50%, -50%) scale(0.45)"
              : "translate(-50%, -50%) scale(0.01)",
            opacity: uiHidden ? 0 : lightGrowing ? 0.22 : 0,
            transition: uiHidden ? LIGHT_FADE_TRANSITION : LIGHT_GROW_TRANSITION,
            background:
              "radial-gradient(circle, rgba(0,212,170,0.12) 0%, rgba(0,212,170,0.04) 42%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />
      </div>

      <div
        className="absolute inset-0 z-[2] flex items-center justify-center"
        style={{
          transform: uiHidden ? "scale(1)" : doorOpening ? "scale(1)" : "scale(0.96)",
          opacity: uiHidden ? 0 : doorOpening ? 1 : 0.7,
          transition: TEXT_FADE_TRANSITION,
        }}
      >
        <div className="text-center px-6">
          <h1 className="font-display m-0 text-xl uppercase tracking-[0.18em] text-foreground sm:text-2xl">
            Cragmate Gym
          </h1>
          <p className="m-0 mt-3 min-h-[18px] text-[13px] uppercase tracking-[0.12em] text-muted-foreground">
            {doorOpening ? "Doors opening…" : "Approaching entrance…"}
          </p>
        </div>
      </div>

      <div
        className="absolute -inset-x-[12%] inset-y-0 z-[3] overflow-visible"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 50%", transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute left-0 top-0 h-full w-1/2 border-r border-border/40 bg-card will-change-transform"
          style={{
            transform: doorOpening ? "rotateY(-68deg) translateX(-6%)" : "rotateY(0deg) translateX(0%)",
            transformOrigin: "left center",
            opacity: uiHidden ? 0 : 1,
            transition: DOOR_TRANSITION,
          }}
        >
          <div className="absolute inset-[6%_4%] border border-border/20 bg-card" />
          <div className="absolute right-[6%] top-1/2 h-[72px] w-1.5 -translate-y-1/2 rounded-full bg-muted-foreground/40 shadow-sm" />
          <div
            className="pointer-events-none absolute inset-0 bg-black transition-opacity"
            style={{
              opacity: doorOpening && !uiHidden ? 0.28 : 0,
              transition: `opacity ${DOOR_ANIMATION_MS}ms ${DOOR_EASE}`,
            }}
          />
        </div>

        <div
          className="absolute right-0 top-0 h-full w-1/2 border-l border-border/40 bg-card will-change-transform"
          style={{
            transform: doorOpening ? "rotateY(68deg) translateX(6%)" : "rotateY(0deg) translateX(0%)",
            transformOrigin: "right center",
            opacity: uiHidden ? 0 : 1,
            transition: RIGHT_DOOR_TRANSITION,
          }}
        >
          <div className="absolute inset-[6%_4%] border border-border/20 bg-card" />
          <div className="absolute left-[6%] top-1/2 h-[72px] w-1.5 -translate-y-1/2 rounded-full bg-muted-foreground/40 shadow-sm" />
          <div
            className="pointer-events-none absolute inset-0 bg-black transition-opacity"
            style={{
              opacity: doorOpening && !uiHidden ? 0.28 : 0,
              transition: `opacity ${DOOR_ANIMATION_MS}ms ${DOOR_EASE} ${DOOR_STAGGER_MS}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
