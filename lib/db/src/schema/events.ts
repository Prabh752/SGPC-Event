import { pgTable, serial, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventTypeEnum = pgEnum("event_type", [
  "major_gurpurab",
  "regular_diwan",
  "kirtan_darbar",
  "amrit_sanchar",
  "community_camp",
]);

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  type: eventTypeEnum("type").notNull(),
  volunteersNeeded: integer("volunteers_needed").notNull().default(0),
  estimatedBudget: numeric("estimated_budget", { precision: 12, scale: 2 }).notNull().default("0"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
