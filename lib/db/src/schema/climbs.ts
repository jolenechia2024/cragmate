import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";

export const climbsTable = pgTable("climbs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  gradeSystem: text("grade_system").notNull().default("V-scale"),
  style: text("style"),
  sent: boolean("sent").notNull().default(false),
  attempts: integer("attempts").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClimbSchema = createInsertSchema(climbsTable).omit({ id: true, createdAt: true });
export type InsertClimb = z.infer<typeof insertClimbSchema>;
export type Climb = typeof climbsTable.$inferSelect;
