import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gymsRouter from "./gyms";
import sessionsRouter from "./sessions";
import climbsRouter from "./climbs";
import partnersRouter from "./partners";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gymsRouter);
router.use(sessionsRouter);
router.use(climbsRouter);
router.use(partnersRouter);
router.use(aiRouter);

export default router;
