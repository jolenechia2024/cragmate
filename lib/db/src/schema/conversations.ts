import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { partnerPostsTable } from "./partnerPosts";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  // Optional link back to a partner finder post (context)
  postId: integer("post_id").references(() => partnerPostsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationMembersTable = pgTable("conversation_members", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationMessagesTable = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

