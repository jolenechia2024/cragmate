import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type InsightCardProps = {
  title: string;
  description?: string;
  buttonLabel: string;
  emptyHint?: string;
  disabled?: boolean;
  disabledReason?: string;
  onGenerate: () => Promise<string>;
  className?: string;
  compact?: boolean;
};

export function InsightCard({
  title,
  description,
  buttonLabel,
  emptyHint,
  disabled,
  disabledReason,
  onGenerate,
  className,
  compact = false,
}: InsightCardProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await onGenerate();
      setText(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={cn(
        "border-primary/15 bg-card/80",
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
        className,
      )}
    >
      <div className={cn("mb-3", compact ? "mb-2" : "mb-4")}>
        <h3
          className={cn(
            "font-display uppercase tracking-wider text-foreground",
            compact ? "text-base sm:text-lg" : "text-lg sm:text-xl",
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {emptyHint && !text && !loading && (
        <p className="text-xs text-muted-foreground mb-3">{emptyHint}</p>
      )}

      {text && (
        <div className="mb-4 rounded-lg border border-border/80 bg-background/40 p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
          {text}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mb-3" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        className="border-primary/30 hover:border-primary"
        disabled={disabled || loading}
        onClick={handleGenerate}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            One moment…
          </>
        ) : (
          text ? "Refresh" : buttonLabel
        )}
      </Button>

      {disabled && disabledReason && (
        <p className="text-xs text-muted-foreground mt-2">{disabledReason}</p>
      )}
    </Card>
  );
}
