import { Router } from "express";
import { db } from "@workspace/db";
import { volunteersTable, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateVolunteerBody } from "@workspace/api-zod";

const router = Router();

router.get("/volunteers", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: volunteersTable.id,
        eventId: volunteersTable.eventId,
        eventTitle: eventsTable.title,
        name: volunteersTable.name,
        phone: volunteersTable.phone,
        department: volunteersTable.department,
        registeredAt: volunteersTable.registeredAt,
      })
      .from(volunteersTable)
      .leftJoin(eventsTable, eq(volunteersTable.eventId, eventsTable.id))
      .orderBy(volunteersTable.registeredAt);

    let result = rows;
    const { eventId, department } = req.query;
    if (eventId) result = result.filter((v) => v.eventId === Number(eventId));
    if (department) result = result.filter((v) => v.department === department);

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list volunteers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/volunteers", async (req, res) => {
  try {
    const body = CreateVolunteerBody.parse(req.body);
    const [volunteer] = await db
      .insert(volunteersTable)
      .values({
        eventId: body.eventId,
        name: body.name,
        phone: body.phone,
        department: body.department,
      })
      .returning();

    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, volunteer.eventId));
    res.status(201).json({ ...volunteer, eventTitle: event?.title });
  } catch (err) {
    req.log.error({ err }, "Failed to create volunteer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/volunteers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(volunteersTable).where(eq(volunteersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete volunteer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/volunteers/fulfillment", async (req, res) => {
  try {
    const events = await db.select().from(eventsTable);
    const volunteers = await db.select().from(volunteersTable);

    const result = events.map((event) => {
      const registered = volunteers.filter((v) => v.eventId === event.id).length;
      const needed = event.volunteersNeeded;
      return {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        volunteersNeeded: needed,
        volunteersRegistered: registered,
        fulfillmentPercent: needed > 0 ? Math.min(100, Math.round((registered / needed) * 100)) : 0,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get volunteer fulfillment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
