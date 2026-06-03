import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip wrapping straight or curly quotes from user-entered notes/descriptions. */
export function stripSurroundingQuotes(text: string): string {
  let t = text.trim();
  const pairs: [string, string][] = [
    ['"', '"'],
    ["'", "'"],
    ["\u201c", "\u201d"],
    ["\u2018", "\u2019"],
  ];
  for (const [open, close] of pairs) {
    if (t.length >= 2 && t.startsWith(open) && t.endsWith(close)) {
      t = t.slice(open.length, -close.length).trim();
    }
  }
  return t;
}

export function formatDate(dateString: string) {
  const date = parseLocalDate(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** For session cards: stable two-line date without cramped pill wrapping. */
export function formatSessionLogDate(dateString: string) {
  const date = parseLocalDate(dateString);
  return {
    monthDay: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date),
    year: new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(date),
  };
}

function parseLocalDate(dateString: string) {
  const normalized = dateString.includes("T") ? dateString : `${dateString}T12:00:00`;
  return new Date(normalized);
}

export const GUEST_USER_ID = "guest-user";
