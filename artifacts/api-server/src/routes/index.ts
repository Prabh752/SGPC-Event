import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import eventsRouter from "./events";
import volunteersRouter from "./volunteers";
import expensesRouter from "./expenses";
import notificationsRouter from "./notifications";
import activityLogsRouter from "./activityLogs";
import usersRouter from "./users";
import authRouter, { sessions } from "./auth";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(authRouter);
router.use(healthRouter);

// Auth middleware for all routes below
router.use((req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = sessions.get(auth.slice(7));
  if (!user) {
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }
  next();
});

// Protected routes
router.use(dashboardRouter);
router.use(eventsRouter);
router.use(volunteersRouter);
router.use(expensesRouter);
router.use(notificationsRouter);
router.use(activityLogsRouter);
router.use(usersRouter);

export default router;
