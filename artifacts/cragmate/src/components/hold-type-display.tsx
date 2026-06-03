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
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "relative flex aspect-square w-full max-w-[140px] items-center justify-center overflow-visible rounded-lg border border-white/10 bg-transparent p-2",
          imageClassName,
        )}
      >
        {hold.image ? (
          <img
            src={hold.image}
            alt={`${hold.name} hold`}
            className="max-h-full max-w-full object-contain brightness-[1.06] contrast-[1.18] saturate-[1.2]"
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
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4", className)}>
      <HoldTypeDisplay hold={hold} holdId={hold.id} className="mx-auto shrink-0 sm:mx-0" />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="font-display text-lg sm:text-xl uppercase tracking-wide text-foreground">{hold.name}</p>
        <p className="mt-1 leading-snug text-sm sm:text-base text-muted-foreground">{hold.tip}</p>
      </div>
    </div>
  );
}
