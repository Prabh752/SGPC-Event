import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const departmentEnum = pgEnum("department", [
  "langar",
  "joda_ghar",
  "parking",
  "kirtan_stage",
  "cleaning",
  "security",
]);

export const volunteersTable = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  department: departmentEnum("department").notNull(),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const insertVolunteerSchema = createInsertSchema(volunteersTable).omit({ id: true, registeredAt: true });
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type Volunteer = typeof volunteersTable.$inferSelect;
