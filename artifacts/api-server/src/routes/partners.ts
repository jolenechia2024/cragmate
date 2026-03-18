import { Router, type IRouter } from "express";
import { db, partnerPostsTable, partnerMessagesTable, gymsTable } from "@workspace/db";
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

    return res.json(
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
    return res.status(500).json({ error: "Failed to fetch partner posts" });
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

    return res.status(201).json({
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
    return res.status(400).json({ error: "Failed to create partner post" });
  }
});

router.delete("/partner-posts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(partnerPostsTable).where(eq(partnerPostsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete partner post" });
  }
});

router.get("/partner-posts/:id/messages", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const rows = await db
      .select()
      .from(partnerMessagesTable)
      .where(eq(partnerMessagesTable.postId, postId))
      .orderBy(desc(partnerMessagesTable.createdAt));

    return res.json(
      rows.map((m) => ({
        id: m.id,
        postId: m.postId,
        senderId: m.senderId,
        senderName: m.senderName,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/partner-posts/:id/messages", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { senderId, senderName, body } = req.body ?? {};

    if (!senderId || !senderName || !body || typeof body !== "string") {
      return res.status(400).json({ error: "Invalid message body" });
    }

    const [msg] = await db
      .insert(partnerMessagesTable)
      .values({
        postId,
        senderId,
        senderName,
        body,
      })
      .returning();

    return res.status(201).json({
      id: msg.id,
      postId: msg.postId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: "Failed to create message" });
  }
});

export default router;
