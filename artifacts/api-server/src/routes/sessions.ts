import { Router, type IRouter } from "express";
import { db, sessionsTable, gymsTable, climbsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { CreateSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

const GRADE_ORDER = [
  "VB", "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9",
  "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17",
  "3", "4", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+",
  "9a", "9a+",
];

function gradeNumeric(grade: string): number {
  const idx = GRADE_ORDER.indexOf(grade);
  if (idx !== -1) return idx;
  return -1;
}

router.get("/sessions", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;

    let rows;
    if (userId) {
      rows = await db
        .select({
          session: sessionsTable,
          gymName: gymsTable.name,
          climbCount: count(climbsTable.id),
        })
        .from(sessionsTable)
        .leftJoin(gymsTable, eq(sessionsTable.gymId, gymsTable.id))
        .leftJoin(climbsTable, eq(climbsTable.sessionId, sessionsTable.id))
        .where(eq(sessionsTable.userId, userId))
        .groupBy(sessionsTable.id, gymsTable.name)
        .orderBy(desc(sessionsTable.date));
    } else {
      rows = await db
        .select({
          session: sessionsTable,
          gymName: gymsTable.name,
          climbCount: count(climbsTable.id),
        })
        .from(sessionsTable)
        .leftJoin(gymsTable, eq(sessionsTable.gymId, gymsTable.id))
        .leftJoin(climbsTable, eq(climbsTable.sessionId, sessionsTable.id))
        .groupBy(sessionsTable.id, gymsTable.name)
        .orderBy(desc(sessionsTable.date));
    }

    const results = await Promise.all(
      rows.map(async (row) => {
        const climbs = await db
          .select()
          .from(climbsTable)
          .where(eq(climbsTable.sessionId, row.session.id));
        const sentClimbs = climbs.filter((c) => c.sent);
        const topGrade = sentClimbs.reduce((best, c) => {
          return gradeNumeric(c.grade) > gradeNumeric(best) ? c.grade : best;
        }, "");
        return {
          id: row.session.id,
          userId: row.session.userId,
          gymId: row.session.gymId,
          gymName: row.gymName ?? "",
          date: row.session.date,
          notes: row.session.notes ?? undefined,
          climbCount: Number(row.climbCount),
          topGrade: topGrade || undefined,
          createdAt: row.session.createdAt.toISOString(),
        };
      })
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const body = CreateSessionBody.parse(req.body);
    const [session] = await db
      .insert(sessionsTable)
      .values({
        userId: body.userId,
        gymId: body.gymId,
        date: body.date,
        notes: body.notes ?? null,
      })
      .returning();

    const gym = await db
      .select()
      .from(gymsTable)
      .where(eq(gymsTable.id, body.gymId))
      .limit(1);

    res.status(201).json({
      id: session.id,
      userId: session.userId,
      gymId: session.gymId,
      gymName: gym[0]?.name ?? "",
      date: session.date,
      notes: session.notes ?? undefined,
      climbCount: 0,
      createdAt: session.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db
      .select({ session: sessionsTable, gymName: gymsTable.name })
      .from(sessionsTable)
      .leftJoin(gymsTable, eq(sessionsTable.gymId, gymsTable.id))
      .where(eq(sessionsTable.id, id))
      .limit(1);

    if (!rows.length) {
      return res.status(404).json({ error: "Session not found" });
    }

    const row = rows[0];
    const climbs = await db
      .select()
      .from(climbsTable)
      .where(eq(climbsTable.sessionId, id))
      .orderBy(desc(climbsTable.createdAt));

    const sentClimbs = climbs.filter((c) => c.sent);
    const topGrade = sentClimbs.reduce((best, c) => {
      return gradeNumeric(c.grade) > gradeNumeric(best) ? c.grade : best;
    }, "");

    res.json({
      id: row.session.id,
      userId: row.session.userId,
      gymId: row.session.gymId,
      gymName: row.gymName ?? "",
      date: row.session.date,
      notes: row.session.notes ?? undefined,
      climbCount: climbs.length,
      topGrade: topGrade || undefined,
      createdAt: row.session.createdAt.toISOString(),
      climbs: climbs.map((c) => ({
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

router.delete("/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;

    let sessionQuery = db.select().from(sessionsTable);
    const sessions = userId
      ? await db.select().from(sessionsTable).where(eq(sessionsTable.userId, userId))
      : await db.select().from(sessionsTable);

    const sessionIds = sessions.map((s) => s.id);

    let climbs: Array<typeof climbsTable.$inferSelect> = [];
    if (sessionIds.length > 0) {
      const allClimbs = await db.select().from(climbsTable);
      climbs = allClimbs.filter((c) => sessionIds.includes(c.sessionId));
    }

    const totalSessions = sessions.length;
    const totalClimbs = climbs.length;
    const totalSends = climbs.filter((c) => c.sent).length;

    const sentClimbs = climbs.filter((c) => c.sent);
    const topGradeEver = sentClimbs.reduce((best, c) => {
      return gradeNumeric(c.grade) > gradeNumeric(best) ? c.grade : best;
    }, "");

    const gymCounts: Record<number, number> = {};
    for (const s of sessions) {
      gymCounts[s.gymId] = (gymCounts[s.gymId] ?? 0) + 1;
    }
    const favGymId = Object.entries(gymCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    let favoriteGym: string | undefined;
    if (favGymId) {
      const gym = await db
        .select()
        .from(gymsTable)
        .where(eq(gymsTable.id, parseInt(favGymId)))
        .limit(1);
      favoriteGym = gym[0]?.name;
    }

    const monthCounts: Record<string, number> = {};
    for (const s of sessions) {
      const month = s.date.substring(0, 7);
      monthCounts[month] = (monthCounts[month] ?? 0) + 1;
    }
    const sessionsByMonth = Object.entries(monthCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    const gradeCounts: Record<string, number> = {};
    for (const c of sentClimbs) {
      gradeCounts[c.grade] = (gradeCounts[c.grade] ?? 0) + 1;
    }
    const gradeDistribution = Object.entries(gradeCounts)
      .sort((a, b) => gradeNumeric(a[0]) - gradeNumeric(b[0]))
      .map(([grade, count]) => ({ grade, count }));

    const progressionByDate: Record<string, string> = {};
    for (const s of sessions.sort((a, b) => a.date.localeCompare(b.date))) {
      const sessionClimbs = sentClimbs.filter((c) => c.sessionId === s.id);
      const topGrade = sessionClimbs.reduce((best, c) => {
        return gradeNumeric(c.grade) > gradeNumeric(best) ? c.grade : best;
      }, "");
      if (topGrade) {
        progressionByDate[s.date] = topGrade;
      }
    }
    let runningBest = "";
    const progressionOverTime = Object.entries(progressionByDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, grade]) => {
        if (gradeNumeric(grade) > gradeNumeric(runningBest)) {
          runningBest = grade;
        }
        return {
          date,
          topGrade: runningBest,
          gradeNumeric: gradeNumeric(runningBest),
        };
      });

    res.json({
      totalSessions,
      totalClimbs,
      totalSends,
      topGradeEver: topGradeEver || undefined,
      favoriteGym,
      sessionsByMonth,
      gradeDistribution,
      progressionOverTime,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
