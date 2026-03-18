import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const partnerPostsTable = pgTable("partner_posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  sessionDate: text("session_date").notNull(),
  sessionTime: text("session_time"),
  gradeRange: text("grade_range").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const partnerMessagesTable = pgTable("partner_messages", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => partnerPostsTable.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPartnerPostSchema = createInsertSchema(partnerPostsTable).omit({ id: true, createdAt: true });
export type InsertPartnerPost = z.infer<typeof insertPartnerPostSchema>;
export type PartnerPost = typeof partnerPostsTable.$inferSelect;

export const insertPartnerMessageSchema = createInsertSchema(partnerMessagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPartnerMessage = z.infer<typeof insertPartnerMessageSchema>;
export type PartnerMessage = typeof partnerMessagesTable.$inferSelect;
