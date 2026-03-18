import { Router, type IRouter } from "express";
import { db, gymsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/gyms", async (_req, res) => {
  try {
    const gyms = await db.select().from(gymsTable).orderBy(gymsTable.name);
    const mapped = gyms.map((g) => ({
      id: g.id,
      name: g.name,
      location: g.location,
      nearestMrt: g.nearestMrt,
      dayPassPrice: Number(g.dayPassPrice),
      membershipPrice: g.membershipPrice ? Number(g.membershipPrice) : undefined,
      openingHours: g.openingHours,
      routeSetDay: g.routeSetDay ?? undefined,
      gradeSystem: g.gradeSystem,
      website: g.website ?? undefined,
      imageUrl: g.imageUrl ?? undefined,
      routesetSchedule: g.routesetSchedule ?? undefined,
      routesetScheduleUpdatedAt: g.routesetScheduleUpdatedAt
        ? g.routesetScheduleUpdatedAt.toISOString()
        : undefined,
      description: g.description ?? undefined,
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch gyms" });
  }
});

export default router;
