import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gymsRouter from "./gyms";
import sessionsRouter from "./sessions";
import climbsRouter from "./climbs";
import partnersRouter from "./partners";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gymsRouter);
router.use(sessionsRouter);
router.use(climbsRouter);
router.use(partnersRouter);

export default router;
