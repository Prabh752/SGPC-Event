import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, eventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SendNotificationBody } from "@workspace/api-zod";

const router = Router();

router.get("/notifications", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: notificationsTable.id,
        title: notificationsTable.title,
        message: notificationsTable.message,
        audience: notificationsTable.audience,
        channels: notificationsTable.channels,
        eventId: notificationsTable.eventId,
        sentBy: usersTable.name,
        sentAt: notificationsTable.sentAt,
      })
      .from(notificationsTable)
      .leftJoin(usersTable, eq(notificationsTable.sentBy, usersTable.id))
      .orderBy(notificationsTable.sentAt);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications", async (req, res) => {
  try {
    const body = SendNotificationBody.parse(req.body);
    const [notification] = await db
      .insert(notificationsTable)
      .values({
        title: body.title,
        message: body.message,
        audience: body.audience,
        channels: body.channels,
        eventId: body.eventId ?? null,
      })
      .returning();

    res.status(201).json(notification);
  } catch (err) {
    req.log.error({ err }, "Failed to send notification");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
