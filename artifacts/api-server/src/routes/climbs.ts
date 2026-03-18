import { Router, type IRouter } from "express";
import { db, climbsTable, sessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateClimbBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sessions/:sessionId/climbs", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const climbs = await db
      .select()
      .from(climbsTable)
      .where(eq(climbsTable.sessionId, sessionId))
      .orderBy(desc(climbsTable.createdAt));

    res.json(
      climbs.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        grade: c.grade,
        gradeSystem: c.gradeSystem,
        style: c.style ?? undefined,
        sent: c.sent,
        attempts: c.attempts ?? 1,
        notes: c.notes ?? undefined,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch climbs" });
  }
});

router.post("/sessions/:sessionId/climbs", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const body = CreateClimbBody.parse(req.body);

    const [climb] = await db
      .insert(climbsTable)
      .values({
        sessionId,
        grade: body.grade,
        gradeSystem: body.gradeSystem ?? "V-scale",
        style: body.style ?? null,
        sent: body.sent,
        attempts: body.attempts ?? 1,
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({
      id: climb.id,
      sessionId: climb.sessionId,
      grade: climb.grade,
      gradeSystem: climb.gradeSystem,
      style: climb.style ?? undefined,
      sent: climb.sent,
      attempts: climb.attempts ?? 1,
      notes: climb.notes ?? undefined,
      createdAt: climb.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to log climb" });
  }
});

router.delete("/climbs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(climbsTable).where(eq(climbsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete climb" });
  }
});

export default router;
