import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, activityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBody } from "@workspace/api-zod";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      role: usersTable.role,
      lastLogin: usersTable.lastLogin,
      createdAt: usersTable.createdAt,
    }).from(usersTable).orderBy(usersTable.createdAt);
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const body = CreateUserBody.parse(req.body);
    const [user] = await db
      .insert(usersTable)
      .values({
        username: body.username,
        name: body.name,
        role: body.role,
        passwordHash: body.password,
      })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        name: usersTable.name,
        role: usersTable.role,
        lastLogin: usersTable.lastLogin,
        createdAt: usersTable.createdAt,
      });

    await db.insert(activityLogsTable).values({
      action: `New user "${body.name}" (${body.role}) added to the system`,
    });

    res.status(201).json(user);
  } catch (err) {
    req.log.error({ err }, "Failed to create user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
