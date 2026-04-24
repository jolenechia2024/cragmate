import { Router, type IRouter } from "express";
import { db, climbsTable, sessionsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { CreateClimbBody } from "@workspace/api-zod";
import requireSupabaseAuth from "../middlewares/requireSupabaseAuth";

const router: IRouter = Router();
router.get("/sessions/:sessionId/climbs", requireSupabaseAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const userId = (req as any).authUserId as string;
    const climbs = await db
      .select({
        id: climbsTable.id,
        sessionId: climbsTable.sessionId,
        grade: climbsTable.grade,
        gradeSystem: climbsTable.gradeSystem,
        style: climbsTable.style,
        sent: climbsTable.sent,
        attempts: climbsTable.attempts,
        notes: climbsTable.notes,
        createdAt: climbsTable.createdAt,
      })
      .from(climbsTable)
      .innerJoin(sessionsTable, eq(climbsTable.sessionId, sessionsTable.id))
      .where(
        and(eq(climbsTable.sessionId, sessionId), eq(sessionsTable.userId, userId)),
      )
      .orderBy(desc(climbsTable.createdAt));

    return res.json(
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
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch climbs" });
  }
});

router.post("/sessions/:sessionId/climbs", requireSupabaseAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const userId = (req as any).authUserId as string;
    const body = CreateClimbBody.parse(req.body);
    const trimmedNotes = body.notes?.trim() ?? "";

    const sessionRows = await db
      .select({ id: sessionsTable.id })
      .from(sessionsTable)
      .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
      .limit(1);
    if (!sessionRows.length) return res.status(404).json({ error: "Session not found" });

    const [climb] = await db
      .insert(climbsTable)
      .values({
        sessionId,
        grade: body.grade,
        gradeSystem: body.gradeSystem ?? "V-scale",
        style: body.style ?? null,
        sent: body.sent,
        attempts: body.attempts ?? 1,
        notes: trimmedNotes || null,
      })
      .returning();

    return res.status(201).json({
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
    return res.status(400).json({ error: "Failed to log climb" });
  }
});

router.delete("/climbs/:id", requireSupabaseAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userId = (req as any).authUserId as string;

    const rows = await db
      .select({ id: climbsTable.id })
      .from(climbsTable)
      .innerJoin(sessionsTable, eq(climbsTable.sessionId, sessionsTable.id))
      .where(and(eq(climbsTable.id, id), eq(sessionsTable.userId, userId)))
      .limit(1);

    if (!rows.length) return res.status(404).json({ error: "Climb not found" });

    await db.delete(climbsTable).where(eq(climbsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete climb" });
  }
});

export default router;
