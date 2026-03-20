const STREAK_KEY = "cragmate_climbing_streak_v1";

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

export function bumpClimbingStreak(): StreakState {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastClimbedDay: "" };
  }

  const today = getLocalDayKey(new Date());
  const prev = getStreak();

  // Same day: don't increment
  if (prev.lastClimbedDay === today) {
    return prev;
  }

  // If user climbed yesterday: increment, else reset to 1
  const yesterday = addDays(prev.lastClimbedDay || today, -1);
  const nextStreak =
    prev.lastClimbedDay && prev.lastClimbedDay === yesterday
      ? prev.currentStreak + 1
      : 1;

  const next: StreakState = { currentStreak: nextStreak, lastClimbedDay: today };
  window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}

