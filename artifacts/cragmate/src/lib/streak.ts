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
  return state ?? { currentStreak: 0, lastClimbedDay: "" };
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

export function bumpClimbingStreak(): StreakState {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastClimbedDay: "" };
  }

  const today = getLocalDayKey(new Date());
  const prev = getStreak();

  const prevWeekStart = prev.lastClimbedDay
    ? getWeekStartDayKey(prev.lastClimbedDay)
    : "";
  const thisWeekStart = getWeekStartDayKey(today);

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

  const next: StreakState = { currentStreak: nextStreak, lastClimbedDay: today };
  window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}

