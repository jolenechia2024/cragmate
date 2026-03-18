import { pgTable, serial, text, numeric, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gymsTable = pgTable("gyms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  nearestMrt: text("nearest_mrt").notNull(),
  dayPassPrice: numeric("day_pass_price", { precision: 6, scale: 2 }).notNull(),
  membershipPrice: numeric("membership_price", { precision: 6, scale: 2 }),
  openingHours: text("opening_hours").notNull(),
  routeSetDay: text("route_set_day"),
  gradeSystem: text("grade_system").notNull(),
  website: text("website"),
  imageUrl: text("image_url"),
  description: text("description"),
  routesetSchedule: jsonb("routeset_schedule").$type<{
    sourceUrl?: string;
    extractedText?: string;
  }>(),
  routesetScheduleUpdatedAt: timestamp("routeset_schedule_updated_at", { withTimezone: true }),
});

export const insertGymSchema = createInsertSchema(gymsTable).omit({ id: true });
export type InsertGym = z.infer<typeof insertGymSchema>;
export type Gym = typeof gymsTable.$inferSelect;
