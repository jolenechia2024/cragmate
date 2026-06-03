import type { ClimberType } from "@/lib/quiz-bank";

/** One-line personality blurb for quiz results (headline is shown separately as “The {type}”). */
export function climberTypeBlurb(type: ClimberType | null | undefined): string | null {
  if (!type) return null;
  switch (type) {
    case "Technician":
      return "All about details: tidy foot placements, clean body positions, and smart repeats.";
    case "Explorer":
      return "Progress comes from variety — weird beta, new styles, and exploring different wall sections.";
    case "Strategist":
      return "Plans beat panic: one clear target, tracked attempts, and steady progress through the session.";
    case "Flow Climber":
      return "Best when movement feels smooth: rhythm, breathing, and timing over brute force.";
    case "Motivator":
      return "Energy is fuel: a bit of hype and friendly noise can unlock moves that felt stuck.";
    case "Grinder":
      return "Process-first: same climb, cleaner tries, small upgrades each burn until it clicks.";
    case "Risk-Taker":
      return "Commits hard: big moves and less hesitation — learning curve includes some dramatic whips.";
    case "Calm Connector":
      return "Steady under pressure: reads routes calmly, stays relaxed, and keeps composure on the wall.";
    default:
      return null;
  }
}
