import { Router, type IRouter } from "express";
import { db, partnerPostsTable, gymsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreatePartnerPostBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/partner-posts", async (_req, res) => {
  try {
    const rows = await db
      .select({ post: partnerPostsTable, gymName: gymsTable.name })
      .from(partnerPostsTable)
      .leftJoin(gymsTable, eq(partnerPostsTable.gymId, gymsTable.id))
      .orderBy(desc(partnerPostsTable.createdAt));

    res.json(
      rows.map((r) => ({
        id: r.post.id,
        userId: r.post.userId,
        userName: r.post.userName,
        gymId: r.post.gymId,
        gymName: r.gymName ?? "",
        sessionDate: r.post.sessionDate,
        sessionTime: r.post.sessionTime ?? undefined,
        gradeRange: r.post.gradeRange,
        message: r.post.message ?? undefined,
        createdAt: r.post.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch partner posts" });
  }
});

router.post("/partner-posts", async (req, res) => {
  try {
    const body = CreatePartnerPostBody.parse(req.body);
    const [post] = await db
      .insert(partnerPostsTable)
      .values({
        userId: body.userId,
        userName: body.userName,
        gymId: body.gymId,
        sessionDate: body.sessionDate,
        sessionTime: body.sessionTime ?? null,
        gradeRange: body.gradeRange,
        message: body.message ?? null,
      })
      .returning();

    const gym = await db
      .select()
      .from(gymsTable)
      .where(eq(gymsTable.id, body.gymId))
      .limit(1);

    res.status(201).json({
      id: post.id,
      userId: post.userId,
      userName: post.userName,
      gymId: post.gymId,
      gymName: gym[0]?.name ?? "",
      sessionDate: post.sessionDate,
      sessionTime: post.sessionTime ?? undefined,
      gradeRange: post.gradeRange,
      message: post.message ?? undefined,
      createdAt: post.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to create partner post" });
  }
});

router.delete("/partner-posts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(partnerPostsTable).where(eq(partnerPostsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete partner post" });
  }
});

export default router;
