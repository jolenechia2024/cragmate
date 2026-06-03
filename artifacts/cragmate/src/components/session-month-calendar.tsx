import { useMemo, useState, type ReactNode } from "react";
import { Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Mountain } from "lucide-react";

export type SessionLikeCalendar = { date: unknown; climbCount?: number };

function normalizeCalendarDayKey(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw);
  const part = s.includes("T") ? s.split("T")[0]! : s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : null;
}

function formatYmd(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Monday-first weekday index */
function weekdayMondayFirst(d: Date): number {
  const w = d.getDay();
  return w === 0 ? 6 : w - 1;
}

type CalendarVariant = "card" | "flat";

const calendarShell: Record<CalendarVariant, string> = {
  card: "mb-6 overflow-hidden border-primary/25 bg-gradient-to-b from-card via-card to-muted/35 shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
  flat: "mb-8 border-b border-border/50 pb-6",
};

function CalendarShell({
  variant,
  className,
  children,
}: {
  variant: CalendarVariant;
  className?: string;
  children: ReactNode;
}) {
  const cls = cn(calendarShell[variant], className);
  if (variant === "flat") {
    return <div className={cls}>{children}</div>;
  }
  return <Card className={cls}>{children}</Card>;
}

/** Month grid: session dates show a mountain icon; empty days show the date number. */
export function SessionMonthHeatmapCalendar({
  sessions,
  variant = "card",
}: {
  sessions: SessionLikeCalendar[];
  variant?: CalendarVariant;
}) {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const dayAgg = useMemo(() => {
    const map = new Map<string, { sessions: number; climbs: number }>();
    for (const s of sessions) {
      const key = normalizeCalendarDayKey(s.date);
      if (!key) continue;
      const prev = map.get(key) ?? { sessions: 0, climbs: 0 };
      prev.sessions += 1;
      prev.climbs += typeof s.climbCount === "number" ? s.climbCount : 0;
      map.set(key, prev);
    }
    return map;
  }, [sessions]);

  const y = cursor.getFullYear();
  const mon = cursor.getMonth();
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(cursor);
  const first = new Date(y, mon, 1);
  const lastDate = new Date(y, mon + 1, 0).getDate();
  const lead = weekdayMondayFirst(first);
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  const today = new Date();
  const todayY = today.getFullYear();
  const todayMon = today.getMonth();
  const todayDate = today.getDate();

  const summary = useMemo(() => {
    let sessionCount = 0;
    for (let d = 1; d <= lastDate; d++) {
      const key = formatYmd(y, mon, d);
      const a = dayAgg.get(key);
      if (!a || a.sessions === 0) continue;
      sessionCount += a.sessions;
    }
    return { sessionCount };
  }, [dayAgg, y, mon, lastDate]);

  const shiftMonth = (delta: number) => setCursor(new Date(y, mon + delta, 1));

  return (
    <CalendarShell variant={variant}>
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2",
          variant === "card" ? "px-4 pt-4" : "pt-1",
        )}
      >
        <div>
          <p className="font-display text-lg sm:text-2xl tracking-wide capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9 px-3 text-[11px] uppercase tracking-wide" onClick={() => setCursor(new Date(todayY, todayMon, 1))}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Next month" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-7 gap-x-1 sm:gap-x-2 pb-1 text-[10px] sm:text-[11px] text-center uppercase tracking-[0.12em] text-muted-foreground font-semibold",
          variant === "card" ? "px-3" : "px-0",
        )}
      >
        {weekdays.map((letter, ix) => (
          <span key={`${letter}-${ix}`} className="py-1">
            {letter}
          </span>
        ))}
      </div>

      <div
        className={cn(
          "grid grid-cols-7 gap-x-px gap-y-1 sm:gap-x-0.5 sm:gap-y-1.5 pb-4 pt-0.5",
          variant === "card" ? "px-3 sm:px-4" : "px-0",
        )}
      >
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`pad-${i}`} className="h-10 sm:h-11" aria-hidden />
        ))}
        {Array.from({ length: lastDate }, (_, idx) => {
          const day = idx + 1;
          const key = formatYmd(y, mon, day);
          const cell = dayAgg.get(key);
          const hasSession = !!(cell && cell.sessions > 0);
          const climbs = cell?.climbs ?? 0;
          const visits = cell?.sessions ?? 0;
          const isTodayCell = todayY === y && todayMon === mon && todayDate === day;
          const tooltip = !hasSession ? undefined : `${visits} session${visits === 1 ? "" : "s"} · ${climbs} climb${climbs === 1 ? "" : "s"}`;
          const label = hasSession ? `Day ${day}. ${tooltip}` : `Day ${day}`;

          return (
            <div key={key} title={tooltip} aria-label={label} className="flex h-10 sm:h-11 w-full items-center justify-center">
              {hasSession ? (
                <span
                  className={cn(
                    "inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full",
                    "border border-primary/55 bg-gradient-to-b from-primary/30 to-primary/12",
                    "shadow-[0_2px_12px_rgba(0,212,170,0.2)]",
                    isTodayCell && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background drop-shadow-[0_0_8px_rgba(0,212,170,0.45)]",
                  )}
                  aria-hidden
                >
                  <Mountain className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" strokeWidth={2.4} />
                </span>
              ) : (
                <span
                  className={cn(
                    "text-sm sm:text-[15px] font-medium tabular-nums",
                    isTodayCell ? "text-primary font-semibold" : "text-muted-foreground",
                  )}
                >
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "py-3 text-[11px] sm:text-xs text-muted-foreground",
          variant === "card" ? "px-4 border-t border-border/50 bg-muted/20" : "pt-4 px-0",
        )}
      >
        <strong className="text-foreground font-display tabular-nums text-base sm:text-lg">{summary.sessionCount}</strong> total sessions this month
      </div>
    </CalendarShell>
  );
}

export function SessionMonthHeatmapSkeleton({ variant = "card" }: { variant?: CalendarVariant } = {}) {
  return (
    <CalendarShell variant={variant} className={variant === "card" ? "animate-pulse" : undefined}>
      <div className="h-16 px-4 flex items-center justify-between">
        <div className="h-6 w-40 rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-md bg-muted" />
          <div className="h-9 w-16 rounded-md bg-muted" />
          <div className="h-9 w-9 rounded-md bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 gap-x-px px-3 pb-6">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-10 sm:h-11 rounded-sm bg-muted/50" />
        ))}
      </div>
      <div
        className={cn(
          "h-12",
          variant === "card" ? "border-t border-border bg-muted/30" : "pt-2",
        )}
      />
    </CalendarShell>
  );
}
