import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// In-memory session store: token → user info
export const sessions = new Map<string, {
  id: number | string;
  username: string;
  name: string;
  role: string;
}>();

// Master admin credentials (hardcoded)
const MASTER_USERNAME = "Admin@";
const MASTER_PASSWORD = "0987654321";

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    let user: { id: number | string; username: string; name: string; role: string } | null = null;

    // Check master admin first
    if (username === MASTER_USERNAME && password === MASTER_PASSWORD) {
      user = { id: 0, username: MASTER_USERNAME, name: "Administrator", role: "super_admin" };
    } else {
      // Check database users
      const [dbUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1);

      if (dbUser && dbUser.passwordHash === password) {
        user = { id: dbUser.id, username: dbUser.username, name: dbUser.name, role: dbUser.role };

        // Update last login
        await db
          .update(usersTable)
          .set({ lastLogin: new Date() })
          .where(eq(usersTable.id, dbUser.id));
      }
    }

    if (!user) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, user);

    // Auto-expire session after 8 hours
    setTimeout(() => sessions.delete(token), 8 * 60 * 60 * 1000);

    res.json({ token, user });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    sessions.delete(auth.slice(7));
  }
  res.json({ ok: true });
});

router.get("/auth/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = sessions.get(auth.slice(7));
  if (!user) {
    res.status(401).json({ error: "Session expired" });
    return;
  }
  res.json({ user });
});

export default router;
