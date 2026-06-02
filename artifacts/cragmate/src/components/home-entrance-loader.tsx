type HomeEntranceLoaderProps = {
  doorOpening: boolean;
};

/** Full-screen gym entrance: label + double doors open (once per browser tab). */
export function HomeEntranceLoader({ doorOpening }: HomeEntranceLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Entering Cragmate"
    >
      <div className="absolute inset-0 z-[2] flex items-center justify-center">
        <div className="text-center">
          <p className="font-display m-0 text-xl uppercase tracking-[0.18em] text-foreground sm:text-2xl">Cragmate Gym</p>
          <p className="m-0 mt-3 text-[13px] uppercase tracking-[0.12em] text-muted-foreground">
            {doorOpening ? "Doors opening..." : "Approaching entrance..."}
          </p>
        </div>
      </div>
      <div
        className="absolute left-0 top-0 z-[3] h-full w-[52%] border-r border-border/40 bg-card"
        style={{
          transform: doorOpening
            ? "perspective(1400px) rotateY(-76deg) translateX(-12%)"
            : "perspective(1400px) rotateY(0deg) translateX(0%)",
          transformOrigin: "left center",
          transition: "transform 2.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="absolute inset-[6%_4%] border border-border/30" />
        <div className="absolute right-[9%] top-1/2 h-[72px] w-2 -translate-y-1/2 rounded-full bg-muted-foreground/40" />
      </div>
      <div
        className="absolute right-0 top-0 z-[3] h-full w-[52%] border-l border-border/40 bg-card"
        style={{
          transform: doorOpening
            ? "perspective(1400px) rotateY(76deg) translateX(12%)"
            : "perspective(1400px) rotateY(0deg) translateX(0%)",
          transformOrigin: "right center",
          transition: "transform 2.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="absolute inset-[6%_4%] border border-border/30" />
        <div className="absolute left-[9%] top-1/2 h-[72px] w-2 -translate-y-1/2 rounded-full bg-muted-foreground/40" />
      </div>
    </div>
  );
}
