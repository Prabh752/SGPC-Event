import { Router } from "express";
import { db } from "@workspace/db";
import { activityLogsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/activity-logs", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: activityLogsTable.id,
        userId: activityLogsTable.userId,
        userName: usersTable.name,
        action: activityLogsTable.action,
        timestamp: activityLogsTable.timestamp,
      })
      .from(activityLogsTable)
      .leftJoin(usersTable, eq(activityLogsTable.userId, usersTable.id))
      .orderBy(activityLogsTable.timestamp);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list activity logs");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
