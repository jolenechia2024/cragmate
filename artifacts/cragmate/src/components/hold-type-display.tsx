import { cn } from "@/lib/utils";
import type { HoldType, HoldTypeId } from "@/lib/hold-types";
import { getHoldType } from "@/lib/hold-types";

const HOLD_IMAGE_CLASSES: Partial<Record<HoldTypeId, string>> = {
  "crimp-edge": "max-h-[92%] max-w-[98%] object-contain object-center",
  undercling: "max-h-[92%] max-w-[98%] object-contain object-center",
};

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
    <div className={cn("flex w-[120px] max-w-full shrink-0 flex-col items-center gap-2 sm:w-[140px]", className)}>
      <div
        className={cn(
          "relative flex size-[120px] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-transparent p-3 sm:size-[140px] sm:p-4",
          imageClassName,
        )}
      >
        {hold.image ? (
          <img
            src={hold.image}
            alt={`${hold.name} hold`}
            className={cn(
              "block max-h-full max-w-full object-contain object-center brightness-[1.06] contrast-[1.18] saturate-[1.2]",
              HOLD_IMAGE_CLASSES[hold.id] ?? "h-full w-full",
            )}
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
    <div className={cn("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4", className)}>
      <HoldTypeDisplay hold={hold} holdId={hold.id} className="mx-auto sm:mx-0" />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="font-display text-lg sm:text-xl uppercase tracking-wide text-foreground">{hold.name}</p>
        <p className="mt-1 leading-snug text-sm sm:text-base text-muted-foreground">{hold.tip}</p>
      </div>
    </div>
  );
}
