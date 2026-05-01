import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, volunteersTable, expensesTable } from "@workspace/db";
import { eq, gte, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const allEvents = await db.select().from(eventsTable);
    const upcomingEvents = allEvents.filter((e) => e.date >= today).slice(0, 5);

    const allVolunteers = await db.select().from(volunteersTable);
    const allExpenses = await db.select().from(expensesTable);

    const totalEstimatedBudget = allEvents.reduce((sum, e) => sum + Number(e.estimatedBudget), 0);
    const totalActualSpend = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    let sewaFulfillmentPercent = 0;
    if (allEvents.length > 0) {
      const totalNeeded = allEvents.reduce((sum, e) => sum + e.volunteersNeeded, 0);
      const totalRegistered = allVolunteers.length;
      sewaFulfillmentPercent = totalNeeded > 0 ? Math.min(100, Math.round((totalRegistered / totalNeeded) * 100)) : 0;
    }

    const recentExpenses = allExpenses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((e) => ({
        ...e,
        amount: Number(e.amount),
        loggedBy: e.loggedBy ? String(e.loggedBy) : undefined,
        eventTitle: undefined,
      }));

    res.json({
      totalEvents: allEvents.length,
      upcomingEvents: upcomingEvents.length,
      totalVolunteers: allVolunteers.length,
      sewaFulfillmentPercent,
      totalEstimatedBudget,
      totalActualSpend,
      recentExpenses,
      upcomingEventsList: upcomingEvents.map((e) => ({
        ...e,
        estimatedBudget: Number(e.estimatedBudget),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
