import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { usersTable } from "./users";

export const audienceEnum = pgEnum("notification_audience", [
  "all_sangat",
  "active_volunteers",
  "event_volunteers",
]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  audience: audienceEnum("audience").notNull(),
  channels: text("channels").array().notNull().default([]),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "set null" }),
  sentBy: integer("sent_by").references(() => usersTable.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, sentAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
