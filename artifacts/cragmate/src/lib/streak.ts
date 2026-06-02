const STREAK_KEY = "cragmate_climbing_streak_v2";

type StreakState = {
  currentStreak: number;
  lastClimbedDay: string; // YYYY-MM-DD (local)
};

function getLocalDayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Calendar date from API / form values — avoids timezone shifting ISO timestamps. */
function normalizeDayKey(input?: string | null): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  const datePart = s.includes("T") ? s.split("T")[0]! : s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  const parsed = new Date(s);
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

function addDays(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split("-").map((n) => Number(n));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDayKey(dt);
}

function getWeekStartDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map((n) => Number(n));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const mondayOffset = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - mondayOffset);
  return getLocalDayKey(dt);
}

function latestSessionDayKey(sessionDayInputs: readonly string[]): string {
  let latest = "";
  for (const raw of sessionDayInputs) {
    const dk = normalizeDayKey(raw);
    if (dk && dk > latest) latest = dk;
  }
  return latest;
}

/**
 * Monday–Sunday weeks with ≥1 session each, counting consecutive weeks backward from:
 * - this week (if it has a session), else
 * - last week (grace if you have not climbed yet this week), else
 * - streak is 0 (no session this week or last week).
 */
export function weeklyStreakFromSessionDays(sessionDayInputs: readonly string[]): number {
  const weekStarts = new Set<string>();
  for (const raw of sessionDayInputs) {
    const dk = normalizeDayKey(raw);
    if (!dk) continue;
    weekStarts.add(getWeekStartDayKey(dk));
  }
  if (weekStarts.size === 0) return 0;

  const todayKey = getLocalDayKey(new Date());
  const thisWeekStart = getWeekStartDayKey(todayKey);
  const previousWeekStart = addDays(thisWeekStart, -7);

  let cursor: string;
  if (weekStarts.has(thisWeekStart)) {
    cursor = thisWeekStart;
  } else if (weekStarts.has(previousWeekStart)) {
    cursor = previousWeekStart;
  } else {
    return 0;
  }

  let streak = 0;
  while (weekStarts.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/** Recompute streak from session history and persist (source of truth for UI). */
export function syncWeeklyStreakFromSessionDays(sessionDayInputs: readonly string[]): StreakState {
  const currentStreak = weeklyStreakFromSessionDays(sessionDayInputs);
  const lastClimbedDay = latestSessionDayKey(sessionDayInputs);
  const next: StreakState = { currentStreak, lastClimbedDay };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  }
  return next;
}

export function getStreak(): StreakState {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastClimbedDay: "" };
  }
  const state = parseState(window.localStorage.getItem(STREAK_KEY));
  const fallback = { currentStreak: 0, lastClimbedDay: "" };
  if (!state?.lastClimbedDay) return state ?? fallback;

  const today = getLocalDayKey(new Date());
  const thisWeekStart = getWeekStartDayKey(today);
  const previousWeekStart = addDays(thisWeekStart, -7);
  const lastWeekStart = getWeekStartDayKey(state.lastClimbedDay);

  if (lastWeekStart !== thisWeekStart && lastWeekStart !== previousWeekStart) {
    return { currentStreak: 0, lastClimbedDay: state.lastClimbedDay };
  }

  return state;
}

/** @deprecated Prefer syncWeeklyStreakFromSessionDays after session list changes. */
export function bumpClimbingStreak(sessionDay?: string): StreakState {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastClimbedDay: "" };
  }
  const dayKey = normalizeDayKey(sessionDay) ?? getLocalDayKey(new Date());
  const prev = getStreak();
  const prevWeekStart = prev.lastClimbedDay ? getWeekStartDayKey(prev.lastClimbedDay) : "";
  const thisWeekStart = getWeekStartDayKey(dayKey);

  if (prevWeekStart === thisWeekStart) return prev;

  const previousWeekStart = addDays(thisWeekStart, -7);
  const nextStreak =
    prevWeekStart && prevWeekStart === previousWeekStart ? prev.currentStreak + 1 : 1;

  const next: StreakState = { currentStreak: nextStreak, lastClimbedDay: dayKey };
  window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}
