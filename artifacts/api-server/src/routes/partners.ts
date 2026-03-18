import { Router, type IRouter } from "express";
import {
  db,
  partnerPostsTable,
  partnerMessagesTable,
  gymsTable,
  conversationsTable,
  conversationMembersTable,
  conversationMessagesTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { CreatePartnerPostBody } from "@workspace/api-zod";
import requireSupabaseAuth from "../middlewares/requireSupabaseAuth";

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

router.delete("/partner-posts/:id", requireSupabaseAuth, async (req, res) => {
  try {
    const authUserId = (req as any).authUserId as string;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid post id" });

    const [post] = await db
      .select()
      .from(partnerPostsTable)
      .where(eq(partnerPostsTable.id, id))
      .limit(1);

    if (!post || post.userId !== authUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

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

router.get("/inbox", requireSupabaseAuth, async (req, res) => {
  try {
    const userId = (req as any).authUserId as string;

    const memberships = await db
      .select()
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.userId, userId));

    const conversationIds = Array.from(new Set(memberships.map((m) => m.conversationId)));
    if (!conversationIds.length) return res.json([]);

    const conversations = await db.select().from(conversationsTable);
    const convById = new Map(conversations.map((c) => [c.id, c]));

    const result: Array<{
      id: number;
      postId?: number;
      otherUserId: string;
      otherUserName: string;
      lastMessage?: { body: string; createdAt: string; senderName: string };
    }> = [];

    for (const conversationId of conversationIds) {
      const conv = convById.get(conversationId);
      if (!conv) continue;

      const members = await db
        .select()
        .from(conversationMembersTable)
        .where(eq(conversationMembersTable.conversationId, conversationId));

      const other = members.find((m) => m.userId !== userId);
      if (!other) continue;

      const last = await db
        .select()
        .from(conversationMessagesTable)
        .where(eq(conversationMessagesTable.conversationId, conversationId))
        .orderBy(desc(conversationMessagesTable.createdAt))
        .limit(1);

      result.push({
        id: conversationId,
        postId: conv.postId ?? undefined,
        otherUserId: other.userId,
        otherUserName: other.userName,
        lastMessage: last[0]
          ? {
              body: last[0].body,
              createdAt: last[0].createdAt.toISOString(),
              senderName: last[0].senderName,
            }
          : undefined,
      });
    }

    // Most recent first (by last message or createdAt)
    result.sort((a, b) => {
      const ad = a.lastMessage?.createdAt ?? "0000";
      const bd = b.lastMessage?.createdAt ?? "0000";
      return bd.localeCompare(ad);
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

router.post("/conversations", requireSupabaseAuth, async (req, res) => {
  try {
    const authUserId = (req as any).authUserId as string;
    const { postId, memberA, memberB } = req.body ?? {};
    const aId = memberA?.userId as string | undefined;
    const aName = memberA?.userName as string | undefined;
    const bId = memberB?.userId as string | undefined;
    const bName = memberB?.userName as string | undefined;

    if (!aId || !aName || !bId || !bName) {
      return res.status(400).json({ error: "Invalid members" });
    }

    // Privacy: the caller must be the "memberA" from the request.
    // (Frontend sends the currently logged-in user as memberA.)
    if (authUserId !== aId) return res.status(403).json({ error: "Forbidden" });

    // Try to find an existing conversation with the same members + same postId (if provided)
    const aMemberships = await db
      .select()
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.userId, aId));

    let existingId: number | undefined;
    for (const mem of aMemberships) {
      const conv = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, mem.conversationId))
        .limit(1);
      const c = conv[0];
      if (!c) continue;
      if ((postId ?? null) !== (c.postId ?? null)) continue;

      const bMember = await db
        .select()
        .from(conversationMembersTable)
        .where(
          and(
            eq(conversationMembersTable.conversationId, mem.conversationId),
            eq(conversationMembersTable.userId, bId),
          ),
        )
        .limit(1);
      if (bMember.length) {
        existingId = mem.conversationId;
        break;
      }
    }

    if (existingId) return res.json({ id: existingId });

    const [conv] = await db
      .insert(conversationsTable)
      .values({ postId: typeof postId === "number" ? postId : null })
      .returning();

    await db.insert(conversationMembersTable).values([
      { conversationId: conv.id, userId: aId, userName: aName },
      { conversationId: conv.id, userId: bId, userName: bName },
    ]);

    return res.status(201).json({ id: conv.id });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: "Failed to create conversation" });
  }
});

router.get("/conversations/:id/messages", requireSupabaseAuth, async (req, res) => {
  try {
    const rawConversationId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const conversationId = parseInt(rawConversationId, 10);
    if (Number.isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }
    const userId = (req as any).authUserId as string;

    const member = await db
      .select()
      .from(conversationMembersTable)
      .where(
        and(
          eq(conversationMembersTable.conversationId, conversationId),
          eq(conversationMembersTable.userId, userId),
        ),
      )
      .limit(1);
    if (!member.length) return res.status(403).json({ error: "Forbidden" });

    const rows = await db
      .select()
      .from(conversationMessagesTable)
      .where(eq(conversationMessagesTable.conversationId, conversationId))
      .orderBy(desc(conversationMessagesTable.createdAt));

    return res.json(
      rows.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.senderName,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch conversation messages" });
  }
});

router.post("/conversations/:id/messages", requireSupabaseAuth, async (req, res) => {
  try {
    const authUserId = (req as any).authUserId as string;
    const rawConversationId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const conversationId = parseInt(rawConversationId, 10);
    if (Number.isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }
    const { senderId, senderName, body } = req.body ?? {};
    if (!senderId || !senderName || !body || typeof body !== "string") {
      return res.status(400).json({ error: "Invalid message body" });
    }

    // Privacy: don't allow sending as another user.
    if (senderId !== authUserId) return res.status(403).json({ error: "Forbidden" });

    const member = await db
      .select()
      .from(conversationMembersTable)
      .where(
        and(
          eq(conversationMembersTable.conversationId, conversationId),
          eq(conversationMembersTable.userId, senderId),
        ),
      )
      .limit(1);
    if (!member.length) return res.status(403).json({ error: "Forbidden" });

    const [msg] = await db
      .insert(conversationMessagesTable)
      .values({ conversationId, senderId: authUserId, senderName, body })
      .returning();

    return res.status(201).json({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: "Failed to create conversation message" });
  }
});

export default router;
