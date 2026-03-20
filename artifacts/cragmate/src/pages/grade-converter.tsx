import { Layout } from "@/components/layout";
import { Card, Input } from "@/components/ui";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const GRADES = [
  { v: "VB", font: "3", hue: "bg-white", text: "text-black" },
  { v: "V0", font: "4", hue: "bg-gradient-to-r from-white to-green-500", text: "text-black" },
  { v: "V1", font: "5", hue: "bg-green-500", text: "text-white" },
  { v: "V2", font: "5+", hue: "bg-gradient-to-r from-green-500 to-blue-500", text: "text-white" },
  { v: "V3", font: "6A", hue: "bg-blue-500", text: "text-white" },
  { v: "V4", font: "6B / 6B+", hue: "bg-gradient-to-r from-blue-500 to-red-500", text: "text-white" },
  { v: "V5", font: "6C", hue: "bg-red-500", text: "text-white" },
  { v: "V6", font: "7A", hue: "bg-gradient-to-r from-red-500 to-yellow-400", text: "text-black" },
  { v: "V7", font: "7A+", hue: "bg-yellow-400", text: "text-black" },
  { v: "V8", font: "7B / 7B+", hue: "bg-gradient-to-r from-yellow-400 to-black", text: "text-white" },
  { v: "V9", font: "7C", hue: "bg-black", text: "text-white" },
  { v: "V10", font: "7C+", hue: "bg-gradient-to-r from-black to-pink-500", text: "text-white" },
  { v: "V11", font: "8A", hue: "bg-pink-500", text: "text-white" },
  { v: "V12", font: "8A+", hue: "bg-gradient-to-r from-pink-500 to-orange-500", text: "text-white" },
  { v: "V13", font: "8B", hue: "bg-orange-500", text: "text-white" },
];

type GradeRow = (typeof GRADES)[number];

// Baseline mapping sourced from https://blog.ngzhian.com/bouldering-singapore.html (last updated 2025-07-17).
// Approximate cross-gym comparison, not an official grade table.
const GYM_SYSTEMS = {
  "BFF": {
    V1: "1/2",
    V2: "3/4",
    V3: "5/6",
    V4: "7/8",
    V5: "9/10",
    V6: "11/12",
    V7: "13/14",
    V8: "15",
  },
  "Lighthouse": {
    V1: "1",
    V2: "2",
    V3: "3",
    V4: "4",
    V5: "5",
    V6: "6",
    V7: "7",
    V8: "8",
    V9: "12",
  },
  "Boulder Planet": {
    VB: "1",
    V0: "2–3",
    V1: "4",
    V2: "5",
    V3: "6",
    V4: "7",
    V5: "8",
    V6: "9",
    V7: "10",
    V8: "11",
  },
  "Boulder+": {
    V1: "white",
    V2: "yellow",
    V3: "red",
    V4: "blue",
    V5: "purple",
    V6: "green",
    V7: "pink",
    V8: "black",
  },
  "Fit Bloc": {
    V1: "1",
    V2: "2",
    V3: "3",
    V4: "4",
    V5: "5",
    V6: "6",
    V7: "7",
    V8: "8",
  },
  "Ground Up": {
    V1: "V1",
    V2: "V2",
    V3: "V3",
    V4: "V4",
    V5: "V5",
    V6: "V6",
    V7: "V7",
    V8: "V8",
  },
  "Climba": {
    V1: "blue",
    V2: "blue",
    V3: "yellow",
    V4: "yellow",
    V5: "red",
    V6: "red",
  },

  // Boulder Movement uses a tag circuit with overlapping ranges:
  // 1 tag: VB–V1, 2 tags: V1–V2, ..., 8 tags: V8+
  "Boulder Movement": "FLOWER_TAGS",
} as const;

type GymSystemName = keyof typeof GYM_SYSTEMS;

function flowerTagForV(v: string): string | undefined {
  // Overlaps are shown as ranges on the boundary grades.
  // Example: V1 is both 1-tag (VB–V1) and 2-tag (V1–V2) → "1/2"
  switch (v) {
    case "VB":
      return "1";
    case "V0":
      return "1";
    case "V1":
      return "1/2";
    case "V2":
      return "2/3";
    case "V3":
      return "3/4";
    case "V4":
      return "4/5";
    case "V5":
      return "5/6";
    case "V6":
      return "6/7";
    case "V7":
      return "7/8";
    default: {
      // V8 and above
      if (v.startsWith("V")) {
        const n = Number(v.slice(1));
        if (!Number.isNaN(n) && n >= 8) return "8+";
      }
      return undefined;
    }
  }
}

function getGymGrade(system: GymSystemName, row: GradeRow): string | undefined {
  const systemDef = GYM_SYSTEMS[system];

  if (systemDef === "FLOWER_TAGS") return flowerTagForV(row.v);

  if (typeof systemDef === "object") {
    const map = systemDef as Record<string, string | undefined>;
    const direct = map[row.v];
    if (direct) return direct;

    // If a gym mapping stops at some V-grade (common), carry forward the last defined value.
    // Example: Boulder+ has a top colour at V8; treat V9+ as the same top colour.
    if (!row.v.startsWith("V")) return undefined;
    const n = Number(row.v.slice(1));
    if (Number.isNaN(n)) return undefined;

    for (let i = n - 1; i >= 0; i--) {
      const prev = map[`V${i}`];
      if (prev) return prev;
    }

    // As a last fallback, if VB exists in this map (some systems), use it.
    return map["VB"];
  }
  return undefined;
}

function getGymGradeTheme(system: GymSystemName, gymGrade?: string): { hue: string; text: string } {
  if (!gymGrade) return { hue: "bg-muted", text: "text-muted-foreground" };

  // Boulder+ colors, make the gym grade itself look like the circuit colour.
  if (system === "Boulder+") {
    const g = gymGrade.toLowerCase();
    switch (g) {
      case "white":
        return { hue: "bg-white", text: "text-black" };
      case "yellow":
        return { hue: "bg-yellow-400", text: "text-black" };
      case "red":
        return { hue: "bg-red-500", text: "text-white" };
      case "blue":
        return { hue: "bg-blue-500", text: "text-white" };
      case "purple":
        return { hue: "bg-purple-500", text: "text-white" };
      case "green":
        return { hue: "bg-green-500", text: "text-white" };
      case "pink":
        return { hue: "bg-pink-500", text: "text-white" };
      case "black":
        return { hue: "bg-black", text: "text-white" };
      default:
        return { hue: "bg-muted", text: "text-muted-foreground" };
    }
  }

  // Climba colours from the same table.
  if (system === "Climba") {
    const g = gymGrade.toLowerCase();
    if (g.includes("blue")) return { hue: "bg-blue-500", text: "text-white" };
    if (g.includes("yellow")) return { hue: "bg-yellow-400", text: "text-black" };
    if (g.includes("red")) return { hue: "bg-red-500", text: "text-white" };
  }

  // Default: plain chip for non-colour / numeric systems.
  return { hue: "bg-muted/40 border border-border", text: "text-foreground" };
}

function isNumericOnly(value: string): boolean {
  return /^[0-9]+$/.test(value.trim());
}

function shouldUseNeutralChip(system: GymSystemName, gymGrade?: string): boolean {
  if (!gymGrade) return true;
  if (system === "Boulder+" || system === "Climba") return false;
  if (system === "Boulder Movement") return true;
  // Numbers or ranges like "1/2" should be neutral
  if (isNumericOnly(gymGrade)) return true;
  if (/^[0-9]+\/[0-9]+$/.test(gymGrade.trim())) return true;
  if (/^[0-9]+–[0-9]+$/.test(gymGrade.trim())) return true;
  if (/^[0-9]+\\+$/.test(gymGrade.trim())) return true;
  return true;
}

export default function GradeConverter() {
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedGymSystem, setSelectedGymSystem] = useState<GymSystemName>("Boulder+");

  const getExperienceBand = (v: string): { label: string; sub: string; hue: string; text: string } => {
    // User-defined ranges:
    // Beginner (0–3 months): VB–V2
    // Intermediate (3 months–1.5 years): V2–V4
    // Advanced (1.5–3 years): V4–V6
    // Expert (several years + training): V6+
    if (v === "VB" || v === "V0" || v === "V1") {
      return { label: "Beginner", sub: "0–3 months", hue: "bg-teal-950 border border-teal-900", text: "text-teal-200" };
    }
    if (v === "V2") {
      return {
        label: "Beginner / Intermediate",
        sub: "0–3 months / 3 months–1.5 years",
        hue: "bg-teal-950/40 border border-teal-900",
        text: "text-teal-100",
      };
    }
    if (v === "V3") {
      return { label: "Intermediate", sub: "3 months–1.5 years", hue: "bg-blue-950/40 border border-blue-900", text: "text-blue-100" };
    }
    if (v === "V4") {
      return { label: "Intermediate / Advanced", sub: "3 months–1.5 years / 1.5–3 years", hue: "bg-blue-950/30 border border-blue-900", text: "text-blue-100" };
    }
    if (v === "V5") {
      return { label: "Advanced", sub: "1.5–3 years", hue: "bg-purple-950/30 border border-purple-900", text: "text-purple-100" };
    }
    if (v === "V6") {
      return { label: "Advanced / Expert", sub: "1.5–3 years / several+ years", hue: "bg-purple-950/20 border border-purple-900", text: "text-purple-100" };
    }
    // V7+ (and any future grades)
    return { label: "Expert", sub: "several years +", hue: "bg-amber-950/20 border border-amber-900", text: "text-amber-100" };
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredGrades = GRADES.filter((g) => {
    const gymGrade = getGymGrade(selectedGymSystem, g);
    const exp = getExperienceBand(g.v);
    return (
      normalizedSearch === "" ||
      g.v.toLowerCase().includes(normalizedSearch) ||
      exp.label.toLowerCase().includes(normalizedSearch) ||
      (gymGrade?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-widest mb-2">Grade Converter</h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          Convert V-scale to local gym grading systems.
        </p>
      </div>

      <Card className="p-6 mb-8 border-primary/20 shadow-[0_0_30px_rgba(0,212,170,0.05)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by V (e.g. V4) or gym grade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 text-lg h-14 bg-background"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Gym system
            </label>
            <select
              className="w-full h-14 rounded-md border border-border bg-background px-4 text-sm"
              value={selectedGymSystem}
              onChange={(e) => setSelectedGymSystem(e.target.value as GymSystemName)}
            >
              {Object.keys(GYM_SYSTEMS).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        {/* Desktop/tablet grid */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-3 bg-teal-950/20 border-b border-border p-4">
            <div className="font-display text-xl tracking-wider text-muted-foreground uppercase">V-Scale</div>
            <div className="font-display text-xl tracking-wider text-muted-foreground uppercase">{selectedGymSystem}</div>
            <div className="font-display text-xl tracking-wider text-muted-foreground uppercase">Experience</div>
          </div>
          <div className="divide-y divide-border">
            {filteredGrades.map((grade) => (
              <div
                key={grade.v}
                onClick={() => setSelectedGrade(selectedGrade === grade.v ? null : grade.v)}
                className={cn(
                  "grid grid-cols-3 p-4 items-center transition-all duration-300 cursor-pointer relative",
                  selectedGrade === grade.v
                    ? "bg-primary/10 border-l-4 border-l-primary z-10"
                    : "hover:bg-accent/50 border-l-4 border-l-transparent",
                  search && "bg-primary/5",
                )}
              >
                {selectedGrade === grade.v && (
                  <motion.div
                    layoutId="gradeHighlight"
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none"
                  />
                )}
                <div
                  className={cn(
                    "text-2xl font-bold transition-colors relative z-10",
                    selectedGrade === grade.v ? "text-primary" : "",
                  )}
                >
                  {grade.v}
                </div>
                <div className="relative z-10 justify-self-end">
                  {(() => {
                    const gymGrade = getGymGrade(selectedGymSystem, grade);
                    const theme = shouldUseNeutralChip(selectedGymSystem, gymGrade)
                      ? { hue: "bg-muted/40 border border-border", text: "text-foreground" }
                      : getGymGradeTheme(selectedGymSystem, gymGrade);
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center min-w-[6rem] max-w-[6rem] min-h-[3rem] px-2 py-1.5 rounded-md font-bold tracking-wider uppercase text-[11px] shadow-sm",
                          theme.hue,
                          theme.text,
                          selectedGrade === grade.v ? "scale-105 transition-transform" : "transition-transform",
                        )}
                        title={gymGrade ?? "No mapping available"}
                      >
                        {gymGrade ?? "—"}
                      </span>
                    );
                  })()}
                </div>
                <div className="relative z-10 justify-self-end">
                  {(() => {
                    const exp = getExperienceBand(grade.v);
                    return (
                      <span
                        className={cn(
                          "inline-flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm min-w-[9rem] max-w-[9rem] min-h-[3rem] leading-tight text-center",
                          exp.hue,
                          exp.text,
                        )}
                        title={exp.sub}
                      >
                        <span className="uppercase tracking-wider">{exp.label}</span>
                        <span className="opacity-80 font-medium normal-case leading-tight">{exp.sub}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
            {filteredGrades.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No matching grades found.</div>
            )}
          </div>
        </div>

        {/* Mobile stacked cards */}
        <div className="sm:hidden divide-y divide-border">
          {filteredGrades.map((grade) => {
            const gymGrade = getGymGrade(selectedGymSystem, grade);
            const exp = getExperienceBand(grade.v);
            const theme = shouldUseNeutralChip(selectedGymSystem, gymGrade)
              ? { hue: "bg-muted/40 border border-border", text: "text-foreground" }
              : getGymGradeTheme(selectedGymSystem, gymGrade);

            const open = selectedGrade === grade.v;

            return (
              <button
                type="button"
                key={grade.v}
                onClick={() => setSelectedGrade(open ? null : grade.v)}
                className={cn(
                  "w-full text-left p-4 transition-colors",
                  open ? "bg-primary/10" : "hover:bg-accent/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-display text-2xl tracking-wider uppercase">
                    <span className={cn(open ? "text-primary" : "text-foreground")}>{grade.v}</span>
                    <span className="text-xs text-muted-foreground ml-2 align-middle">V-Scale</span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[6.5rem] max-w-[6.5rem] min-h-[3rem] px-2 py-1.5 rounded-md font-bold tracking-wider uppercase text-xs shadow-sm shrink-0",
                      theme.hue,
                      theme.text,
                    )}
                    title={gymGrade ?? "No mapping available"}
                  >
                    {selectedGymSystem}: {gymGrade ?? "—"}
                  </span>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm min-w-[8.5rem] max-w-[9rem] min-h-[3rem] leading-tight text-center shrink-0",
                      exp.hue,
                      exp.text,
                    )}
                    title={exp.sub}
                  >
                    <span className="uppercase tracking-wider">{exp.label}</span>
                    <span className="opacity-80 font-medium normal-case leading-tight">{exp.sub}</span>
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Tap to {open ? "collapse" : "expand"}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredGrades.length === 0 && (
            <div className="p-10 text-center text-muted-foreground">No matching grades found.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
