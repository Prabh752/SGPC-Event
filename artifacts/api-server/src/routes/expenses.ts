import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, eventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateExpenseBody } from "@workspace/api-zod";

const router = Router();

router.get("/expenses", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: expensesTable.id,
        eventId: expensesTable.eventId,
        eventTitle: eventsTable.title,
        description: expensesTable.description,
        amount: expensesTable.amount,
        date: expensesTable.date,
        loggedBy: usersTable.name,
        createdAt: expensesTable.createdAt,
      })
      .from(expensesTable)
      .leftJoin(eventsTable, eq(expensesTable.eventId, eventsTable.id))
      .leftJoin(usersTable, eq(expensesTable.loggedBy, usersTable.id))
      .orderBy(expensesTable.createdAt);

    let result = rows.map((e) => ({ ...e, amount: Number(e.amount) }));

    const { eventId } = req.query;
    if (eventId) result = result.filter((e) => e.eventId === Number(eventId));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list expenses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const body = CreateExpenseBody.parse(req.body);
    const [expense] = await db
      .insert(expensesTable)
      .values({
        eventId: body.eventId,
        description: body.description,
        amount: String(body.amount),
        date: body.date,
      })
      .returning();

    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, expense.eventId));
    res.status(201).json({ ...expense, amount: Number(expense.amount), eventTitle: event?.title });
  } catch (err) {
    req.log.error({ err }, "Failed to create expense");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete expense");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
