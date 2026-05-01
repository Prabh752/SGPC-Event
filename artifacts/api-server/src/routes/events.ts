import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, volunteersTable, expensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateEventBody, UpdateEventBody } from "@workspace/api-zod";

const router = Router();

router.get("/events", async (req, res) => {
  try {
    const events = await db.select().from(eventsTable).orderBy(eventsTable.date);
    const mapped = events.map((e) => ({ ...e, estimatedBudget: Number(e.estimatedBudget) }));

    const { type, upcoming } = req.query;
    let result = mapped;
    if (type) result = result.filter((e) => e.type === type);
    if (upcoming === "true") {
      const today = new Date().toISOString().split("T")[0];
      result = result.filter((e) => e.date >= today);
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list events");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/events", async (req, res) => {
  try {
    const body = CreateEventBody.parse(req.body);
    const [event] = await db
      .insert(eventsTable)
      .values({
        title: body.title,
        date: body.date,
        type: body.type,
        volunteersNeeded: body.volunteersNeeded,
        estimatedBudget: String(body.estimatedBudget),
        description: body.description,
      })
      .returning();
    res.status(201).json({ ...event, estimatedBudget: Number(event.estimatedBudget) });
  } catch (err) {
    req.log.error({ err }, "Failed to create event");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ ...event, estimatedBudget: Number(event.estimatedBudget) });
  } catch (err) {
    req.log.error({ err }, "Failed to get event");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/events/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateEventBody.parse(req.body);
    const [event] = await db
      .update(eventsTable)
      .set({
        title: body.title,
        date: body.date,
        type: body.type,
        volunteersNeeded: body.volunteersNeeded,
        estimatedBudget: String(body.estimatedBudget),
        description: body.description,
      })
      .where(eq(eventsTable.id, id))
      .returning();
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ ...event, estimatedBudget: Number(event.estimatedBudget) });
  } catch (err) {
    req.log.error({ err }, "Failed to update event");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/events/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete event");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/:id/budget-status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    if (!event) return res.status(404).json({ error: "Event not found" });

    const expenses = await db.select().from(expensesTable).where(eq(expensesTable.eventId, id));
    const actualSpend = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const estimatedBudget = Number(event.estimatedBudget);
    const variance = estimatedBudget - actualSpend;

    res.json({
      eventId: event.id,
      eventTitle: event.title,
      estimatedBudget,
      actualSpend,
      variance,
      isOverBudget: actualSpend > estimatedBudget,
      expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get event budget status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
