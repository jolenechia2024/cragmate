import { cn } from "@/lib/utils";
import type { HoldType, HoldTypeId } from "@/lib/hold-types";
import { getHoldType } from "@/lib/hold-types";

type HoldTypeDisplayProps = {
  holdId: HoldTypeId;
  hold?: HoldType;
  className?: string;
  imageClassName?: string;
  showLabel?: boolean;
};

export function HoldTypeDisplay({
  holdId,
  hold: holdProp,
  className,
  imageClassName,
  showLabel = false,
}: HoldTypeDisplayProps) {
  const hold = holdProp ?? getHoldType(holdId);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className={cn(
          "relative aspect-square w-full max-w-[220px] overflow-hidden rounded-xl border border-white/10 bg-[#121615]",
          imageClassName,
        )}
      >
        {hold.image ? (
          <img
            src={hold.image}
            alt={`${hold.name} hold`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-xs uppercase tracking-widest text-muted-foreground">No image</span>
        )}
      </div>
      {showLabel ? (
        <p className="font-display text-sm uppercase tracking-wider text-foreground">{hold.name}</p>
      ) : null}
    </div>
  );
}

type HoldTypeDetailProps = {
  holdId: HoldTypeId;
  hold?: HoldType;
  className?: string;
};

/** Image + name + tip — used on the beginner guide hold picker. */
export function HoldTypeDetail({ holdId, hold: holdProp, className }: HoldTypeDetailProps) {
  const hold = holdProp ?? getHoldType(holdId);

  return (
    <div className={cn("grid gap-4 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start", className)}>
      <HoldTypeDisplay hold={hold} holdId={hold.id} />
      <div className="min-w-0">
        <p className="font-display text-lg sm:text-xl uppercase tracking-wide text-foreground mb-1">{hold.name}</p>
        <p className="leading-relaxed text-sm sm:text-base text-muted-foreground">{hold.tip}</p>
      </div>
    </div>
  );
}
