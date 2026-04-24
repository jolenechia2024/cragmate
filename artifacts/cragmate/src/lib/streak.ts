const STREAK_KEY = "cragmate_climbing_streak_v2";

type StreakState = {
  currentStreak: number;
  lastClimbedDay: string; // YYYY-MM-DD (local)
};

function getLocalDayKey(d: Date): string {
  // Use local time (not UTC) so day boundaries feel correct to users.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDayKey(input?: string | null): string | null {
  if (!input) return null;
  // Accept YYYY-MM-DD directly (date input value).
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return getLocalDayKey(parsed);
}

function parseState(raw: string | null): StreakState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StreakState;
  } catch {
    return null;
  }
}

export function getStreak(): StreakState {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastClimbedDay: "" };
  }
  const state = parseState(window.localStorage.getItem(STREAK_KEY));
  const fallback = { currentStreak: 0, lastClimbedDay: "" };
  if (!state) return fallback;
  if (!state.lastClimbedDay) return fallback;

  // If the last logged session is older than previous week, streak is broken.
  const today = getLocalDayKey(new Date());
  const thisWeekStart = getWeekStartDayKey(today);
  const previousWeekStart = addDays(thisWeekStart, -7);
  const lastWeekStart = getWeekStartDayKey(state.lastClimbedDay);
  if (lastWeekStart !== thisWeekStart && lastWeekStart !== previousWeekStart) {
    const reset: StreakState = { currentStreak: 0, lastClimbedDay: state.lastClimbedDay };
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(reset));
    return reset;
  }

  return state;
}

function addDays(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split("-").map((n) => Number(n));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDayKey(dt);
}

function getWeekStartDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map((n) => Number(n));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  // Monday-based week start: Mon=0 ... Sun=6
  const mondayOffset = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - mondayOffset);
  return getLocalDayKey(dt);
}

export function bumpClimbingStreak(sessionDay?: string): StreakState {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastClimbedDay: "" };
  }

  const dayKey = normalizeDayKey(sessionDay) ?? getLocalDayKey(new Date());
  const prev = getStreak();

  const prevWeekStart = prev.lastClimbedDay
    ? getWeekStartDayKey(prev.lastClimbedDay)
    : "";
  const thisWeekStart = getWeekStartDayKey(dayKey);

  // Already logged this week: don't increment.
  if (prevWeekStart === thisWeekStart) {
    return prev;
  }

  // If user logged in the immediately previous week: increment, else reset to 1.
  const previousWeekStart = addDays(thisWeekStart, -7);
  const nextStreak =
    prevWeekStart && prevWeekStart === previousWeekStart
      ? prev.currentStreak + 1
      : 1;

  const next: StreakState = { currentStreak: nextStreak, lastClimbedDay: dayKey };
  window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}

