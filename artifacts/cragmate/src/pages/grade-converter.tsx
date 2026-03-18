import { Layout } from "@/components/layout";
import { Card, Input } from "@/components/ui";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const GRADES = [
  { v: "VB", font: "3", color: "White", hue: "bg-white", text: "text-black" },
  { v: "V0", font: "4", color: "White/Green", hue: "bg-gradient-to-r from-white to-green-500", text: "text-black" },
  { v: "V1", font: "5", color: "Green", hue: "bg-green-500", text: "text-white" },
  { v: "V2", font: "5+", color: "Green/Blue", hue: "bg-gradient-to-r from-green-500 to-blue-500", text: "text-white" },
  { v: "V3", font: "6A", color: "Blue", hue: "bg-blue-500", text: "text-white" },
  { v: "V4", font: "6B / 6B+", color: "Blue/Red", hue: "bg-gradient-to-r from-blue-500 to-red-500", text: "text-white" },
  { v: "V5", font: "6C", color: "Red", hue: "bg-red-500", text: "text-white" },
  { v: "V6", font: "7A", color: "Red/Yellow", hue: "bg-gradient-to-r from-red-500 to-yellow-400", text: "text-black" },
  { v: "V7", font: "7A+", color: "Yellow", hue: "bg-yellow-400", text: "text-black" },
  { v: "V8", font: "7B / 7B+", color: "Yellow/Black", hue: "bg-gradient-to-r from-yellow-400 to-black", text: "text-white" },
  { v: "V9", font: "7C", color: "Black", hue: "bg-black", text: "text-white" },
  { v: "V10", font: "7C+", color: "Black/Pink", hue: "bg-gradient-to-r from-black to-pink-500", text: "text-white" },
  { v: "V11", font: "8A", color: "Pink", hue: "bg-pink-500", text: "text-white" },
  { v: "V12", font: "8A+", color: "Pink/Orange", hue: "bg-gradient-to-r from-pink-500 to-orange-500", text: "text-white" },
  { v: "V13", font: "8B", color: "Orange", hue: "bg-orange-500", text: "text-white" },
];

export default function GradeConverter() {
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  const filteredGrades = GRADES.filter(g => 
    g.v.toLowerCase().includes(search.toLowerCase()) || 
    g.font.toLowerCase().includes(search.toLowerCase()) ||
    g.color.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-5xl font-display uppercase tracking-widest mb-2">Grade Converter</h1>
        <p className="text-muted-foreground text-lg">Translate difficulty systems instantly.</p>
      </div>

      <Card className="p-6 mb-8 border-primary/20 shadow-[0_0_30px_rgba(0,212,170,0.05)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search by V-scale (e.g. V4), Font (e.g. 6B), or Color..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 text-lg h-14 bg-background"
          />
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="grid grid-cols-3 bg-teal-950/20 border-b border-border p-4">
          <div className="font-display text-xl tracking-wider text-muted-foreground uppercase">V-Scale</div>
          <div className="font-display text-xl tracking-wider text-muted-foreground uppercase">Font</div>
          <div className="font-display text-xl tracking-wider text-muted-foreground uppercase">Generic Color</div>
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
                search && 'bg-primary/5'
              )}
            >
              {selectedGrade === grade.v && (
                <motion.div layoutId="gradeHighlight" className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
              )}
              <div className={cn("text-2xl font-bold transition-colors relative z-10", selectedGrade === grade.v ? "text-primary" : "")}>{grade.v}</div>
              <div className={cn("text-xl font-medium transition-colors relative z-10", selectedGrade === grade.v ? "text-foreground" : "text-muted-foreground")}>{grade.font}</div>
              <div className="relative z-10">
                <span className={`inline-block px-4 py-1.5 rounded-md font-bold tracking-wider uppercase text-sm ${grade.hue} ${grade.text} shadow-sm ${selectedGrade === grade.v ? 'scale-105 transition-transform' : 'transition-transform'}`}>
                  {grade.color}
                </span>
              </div>
            </div>
          ))}
          {filteredGrades.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              No matching grades found.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
