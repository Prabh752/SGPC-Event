import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import eventsRouter from "./events";
import volunteersRouter from "./volunteers";
import expensesRouter from "./expenses";
import notificationsRouter from "./notifications";
import activityLogsRouter from "./activityLogs";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(eventsRouter);
router.use(volunteersRouter);
router.use(expensesRouter);
router.use(notificationsRouter);
router.use(activityLogsRouter);
router.use(usersRouter);

export default router;
