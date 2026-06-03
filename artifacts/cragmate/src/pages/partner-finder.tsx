import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { Card, Button, Dialog, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useListPartnerPosts,
  useCreatePartnerPost,
  useListGyms,
  getListPartnerPostsQueryKey,
  useDeletePartnerPost,
} from "@workspace/api-client-react";
import { cn, formatDate, stripSurroundingQuotes } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  MapPin,
  Calendar,
  Trash2,
  Users,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Mountain,
} from "lucide-react";

const postSchema = z.object({
  gymId: z.coerce.number().min(1, "Gym is required"),
  sessionDate: z.string().min(1, "Date is required"),
  sessionTime: z.string().optional(),
  gradeRange: z.string().min(1, "Grade range is required"),
  message: z.string().optional(),
});

const GRADE_PRESETS = ["VB–V2", "V3–V5", "V6–V8", "6A–6C", "7A+"] as const;

type PartnerMessage = {
  id: number;
  postId: number;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

type Conversation = { id: number };
type ConversationMessage = {
  id: number;
  conversationId: number;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

type PublicRepliesByPost = Record<number, PartnerMessage[]>;

export default function PartnerFinder() {
  const queryClient = useQueryClient();
  const { userId, user, session } = useAuth();
  const accessToken = session?.access_token;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [publicReplyDrafts, setPublicReplyDrafts] = useState<Record<number, string>>({});
  const [gymFilter, setGymFilter] = useState<number | "all">("all");
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [postAnonymously, setPostAnonymously] = useState(false);

  const { data: postsRaw, isLoading } = useListPartnerPosts();
  const posts = Array.isArray(postsRaw) ? postsRaw : [];
  const { data: gymsRaw } = useListGyms();
  const gyms = Array.isArray(gymsRaw) ? gymsRaw : [];

  const filteredPosts = useMemo(() => {
    if (gymFilter === "all") return posts;
    return posts.filter((p) => p.gymId === gymFilter);
  }, [posts, gymFilter]);

  const gymsInPosts = useMemo(() => {
    const ids = new Set(posts.map((p) => p.gymId));
    return gyms.filter((g) => ids.has(g.id));
  }, [posts, gyms]);

  const activeMessagingPost = useMemo(
    () => posts.find((p) => p.id === activePostId),
    [posts, activePostId],
  );

  const openLogin = () => {
    window.dispatchEvent(
      new CustomEvent("cragmate:open-auth", {
        detail: { mode: "login" as const },
      }),
    );
  };

  const createMutation = useCreatePartnerPost({
    request: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartnerPostsQueryKey() });
        setIsDialogOpen(false);
        setPostAnonymously(false);
        reset();
      },
    },
  });

  const deleteMutation = useDeletePartnerPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartnerPostsQueryKey() });
      },
    },
  });

  const publicRepliesQuery = useQuery({
    queryKey: ["partnerPublicReplies", posts.map((p) => p.id).join(",")],
    enabled: posts.length > 0,
    queryFn: async () => {
      const pairs = await Promise.all(
        posts.map(async (p) => {
          const res = await fetch(`/api/partner-posts/${p.id}/messages`);
          if (!res.ok) return [p.id, [] as PartnerMessage[]] as const;
          const data = (await res.json()) as PartnerMessage[];
          return [p.id, data] as const;
        }),
      );
      return Object.fromEntries(pairs) as PublicRepliesByPost;
    },
  });

  const sendPublicReplyMutation = useMutation({
    mutationFn: async (vars: { postId: number; body: string }) => {
      const res = await fetch(`/api/partner-posts/${vars.postId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          senderId: userId,
          senderName: user?.email?.split("@")[0] ?? "Guest Climber",
          body: vars.body,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to send reply");
      }
      return (await res.json()) as PartnerMessage;
    },
    onSuccess: (_msg, vars) => {
      queryClient.invalidateQueries({ queryKey: ["partnerPublicReplies"] });
      setPublicReplyDrafts((prev) => ({ ...prev, [vars.postId]: "" }));
      setExpandedReplies((prev) => ({ ...prev, [vars.postId]: true }));
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
  });

  const conversationQuery = useMutation({
    mutationFn: async (vars: { postId: number; otherUserId: string; otherUserName: string }) => {
      const res = await fetch(`/api/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          postId: vars.postId,
          memberA: { userId, userName: user?.email?.split("@")[0] ?? "Guest Climber" },
          memberB: { userId: vars.otherUserId, userName: vars.otherUserName },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to open conversation");
      }
      return (await res.json()) as Conversation;
    },
    onSuccess: (data) => {
      setActiveConversationId(data.id);
    },
  });

  const messagesQuery = useQuery({
    queryKey: ["conversationMessages", activeConversationId, userId],
    enabled: activeConversationId != null,
    queryFn: async () => {
      const res = await fetch(
        `/api/conversations/${activeConversationId}/messages?userId=${encodeURIComponent(userId)}`,
        {
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to load messages");
      }
      return (await res.json()) as ConversationMessage[];
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (vars: { conversationId: number; body: string }) => {
      const res = await fetch(`/api/conversations/${vars.conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          senderId: userId,
          senderName: user?.email?.split("@")[0] ?? "Guest Climber",
          body: vars.body,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to send message");
      }
      return (await res.json()) as ConversationMessage;
    },
    onSuccess: (_msg, vars) => {
      queryClient.invalidateQueries({ queryKey: ["conversationMessages", vars.conversationId, userId] });
      queryClient.invalidateQueries({ queryKey: ["inbox", userId] });
    },
  });

  const onSubmit = (data: z.infer<typeof postSchema>) => {
    if (!user || !accessToken) {
      openLogin();
      return;
    }
    const message = data.message?.trim();
    createMutation.mutate({
      data: {
        ...data,
        message: message ? stripSurroundingQuotes(message) : undefined,
        userId,
        userName: user?.email?.split("@")[0] ?? "Guest Climber",
        anonymous: postAnonymously,
      },
    });
  };

  function toggleReplies(postId: number) {
    setExpandedReplies((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  return (
    <Layout>
      <PageHeader
        title="Find a Partner"
        description="Post a session and connect with climbers at your gym."
        action={
          <Button
            size="lg"
            onClick={() => {
              if (!user) {
                openLogin();
                return;
              }
              setIsDialogOpen(true);
            }}
            className="gap-2 w-full min-h-11"
          >
            <Plus className="w-5 h-5" /> Post session
          </Button>
        }
      />

      {!user && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border-l-2 border-primary/50 pl-4 py-1">
          <MessageCircle className="w-5 h-5 text-primary shrink-0 hidden sm:block" />
          <p className="text-sm text-muted-foreground flex-1">
            Browse posts as a guest. Sign in to post, reply, and get private messages in your{" "}
            <Link href="/inbox" className="text-primary font-semibold hover:underline">
              Inbox
            </Link>
            .
          </p>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-4 sm:gap-6 border-b border-primary/15 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 shadow-[0_0_16px_rgba(0,212,170,0.12)]">
            <Users className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(0,212,170,0.55)]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/75">Open posts</p>
            <p className="font-display text-2xl sm:text-3xl leading-tight tracking-wide tabular-nums">
              <span className="text-primary">{posts.length}</span>
              <span className="text-foreground/75"> active</span>
            </p>
          </div>
        </div>
        {posts.length > 0 && gymsInPosts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Label htmlFor="gym-filter" className="text-xs uppercase tracking-widest text-muted-foreground mb-0">
              Gym
            </Label>
            <Select
              id="gym-filter"
              className="min-w-[10rem] h-9 text-sm"
              value={gymFilter === "all" ? "all" : String(gymFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setGymFilter(v === "all" ? "all" : Number(v));
              }}
            >
              <option value="all">All gyms</option>
              {gymsInPosts.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-card rounded-xl animate-pulse border border-card-border" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-2 border-primary/20">
          <Users className="w-16 h-16 text-primary mx-auto mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
          <h3 className="text-xl sm:text-2xl font-display uppercase mb-2">No active posts</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Be the first to post when and where you&apos;re climbing — others can reply or message you.
          </p>
          <Button
            onClick={() => {
              if (!user) {
                openLogin();
                return;
              }
              setIsDialogOpen(true);
            }}
          >
            Create post
          </Button>
        </Card>
      ) : filteredPosts.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-primary/20">
          <p className="text-muted-foreground">No posts at this gym. Try another filter or post one yourself.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {filteredPosts.map((post) => {
            const replies = publicRepliesQuery.data?.[post.id] ?? [];
            const replyCount = replies.length;
            const isExpanded = Boolean(expandedReplies[post.id]);
            const isOwnPost = Boolean(user && post.userId === userId);
            const isAnonymous = post.userName === "Anonymous";
            const description = post.message ? stripSurroundingQuotes(post.message) : "";

            return (
              <Card
                key={post.id}
                className="flex flex-col overflow-hidden group hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,212,170,0.08)]"
              >
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-primary font-display text-lg font-bold border border-primary/30">
                        {post.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg uppercase tracking-wide truncate">
                            {post.userName}
                          </h3>
                          {isAnonymous ? (
                            <Badge className="text-[10px] uppercase tracking-wider border border-border/60 bg-muted/30">
                              Anonymous
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isOwnPost && isAnonymous ? "Posted anonymously · " : ""}
                          Posted {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    {isOwnPost && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Delete post"
                        onClick={() => deleteMutation.mutate({ id: post.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-900/50 bg-teal-950/60 px-3 py-1 text-xs font-medium text-teal-200">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[14rem]">{post.gymName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/30 px-3 py-1 text-xs text-foreground">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      {formatDate(post.sessionDate)}
                    </span>
                    {post.sessionTime && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/30 px-3 py-1 text-xs text-foreground">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {post.sessionTime}
                      </span>
                    )}
                    <Badge variant="success" className="gap-1">
                      <Mountain className="w-3 h-3" />
                      {post.gradeRange}
                    </Badge>
                  </div>

                  {description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-4">
                      {description}
                    </p>
                  ) : null}

                  <div className="mt-auto space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => {
                          if (!user) {
                            openLogin();
                            return;
                          }
                          if (isOwnPost) return;
                          setActivePostId(post.id);
                          setMessageDraft("");
                          conversationQuery.mutate({
                            postId: post.id,
                            otherUserId: post.userId,
                            otherUserName: post.userName,
                          });
                        }}
                        disabled={!user || isOwnPost}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {isOwnPost ? "Your post" : "Message privately"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 shrink-0"
                        onClick={() => toggleReplies(post.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        {replyCount === 0 ? "Replies" : `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
                        {replyCount === 0 ? (
                          <p className="text-sm text-muted-foreground">No public replies yet.</p>
                        ) : (
                          <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {replies.map((m) => (
                              <li
                                key={m.id}
                                className="text-sm rounded-md border border-border/50 bg-background/40 p-2.5"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-semibold text-xs uppercase tracking-wider text-foreground">
                                    {m.senderName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {formatDate(m.createdAt)}
                                  </span>
                                </div>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                  {stripSurroundingQuotes(m.body)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex gap-2">
                          <Input
                            value={publicReplyDrafts[post.id] ?? ""}
                            onChange={(e) =>
                              setPublicReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            placeholder={user ? "Reply on this post…" : "Sign in to reply"}
                            disabled={!user}
                            className="text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!user) {
                                openLogin();
                                return;
                              }
                              const body = (publicReplyDrafts[post.id] ?? "").trim();
                              if (!body) return;
                              sendPublicReplyMutation.mutate({ postId: post.id, body });
                            }}
                            disabled={!user || sendPublicReplyMutation.isPending}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setPostAnonymously(false);
        }}
        title="Post a session"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label>Gym</Label>
            <Select {...register("gymId")}>
              <option value="">Select gym…</option>
              {gyms?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            {errors.gymId && <p className="text-destructive text-sm mt-1">{errors.gymId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" {...register("sessionDate")} />
              {errors.sessionDate && (
                <p className="text-destructive text-sm mt-1">{errors.sessionDate.message}</p>
              )}
            </div>
            <div>
              <Label>Time (optional)</Label>
              <Input type="time" {...register("sessionTime")} />
            </div>
          </div>

          <div>
            <Label>Grade range</Label>
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {GRADE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  onClick={() => setValue("gradeRange", preset, { shouldValidate: true })}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Input placeholder="e.g. V3–V5, 6A–6C" {...register("gradeRange")} />
            {errors.gradeRange && (
              <p className="text-destructive text-sm mt-1">{errors.gradeRange.message}</p>
            )}
          </div>

          <div>
            <Label>Message (optional)</Label>
            <Textarea
              className="mt-1"
              placeholder="Projecting V4s, need a belay, casual session…"
              {...register("message")}
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/10 p-3">
            <Checkbox
              id="post-anonymous"
              checked={postAnonymously}
              onCheckedChange={(checked) => setPostAnonymously(checked === true)}
            />
            <div className="min-w-0">
              <Label htmlFor="post-anonymous" className="cursor-pointer font-medium text-foreground">
                Post anonymously
              </Label>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your name won&apos;t show on the post. You can still get replies and private messages.
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Posting…" : "Post session"}
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={activeConversationId != null}
        onOpenChange={(open) => {
          if (!open) {
            setActivePostId(null);
            setActiveConversationId(null);
          }
        }}
        title={
          activeMessagingPost
            ? `Message ${activeMessagingPost.userName}`
            : "Private message"
        }
      >
        <div className="space-y-4">
          {activeMessagingPost && (
            <p className="text-sm text-muted-foreground -mt-2">
              About their session at{" "}
              <span className="text-foreground font-medium">{activeMessagingPost.gymName}</span>
              {" · "}
              {formatDate(activeMessagingPost.sessionDate)}
              {activeMessagingPost.sessionTime ? ` at ${activeMessagingPost.sessionTime}` : ""}
            </p>
          )}

          {conversationQuery.isPending && (
            <p className="text-sm text-muted-foreground">Opening conversation…</p>
          )}

          {messagesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          ) : messagesQuery.isError ? (
            <p className="text-sm text-destructive">{(messagesQuery.error as Error).message}</p>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto space-y-2 rounded-lg border border-border/70 p-3 bg-muted/15">
              {(messagesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Say hi to start the chat.</p>
              ) : (
                (messagesQuery.data ?? [])
                  .slice()
                  .reverse()
                  .map((m) => {
                    const isMine = m.senderId === userId;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[92%] rounded-lg px-3 py-2 text-sm",
                          isMine
                            ? "ml-auto bg-primary/15 border border-primary/25"
                            : "mr-auto bg-card/60 border border-border/60",
                        )}
                      >
                        {!isMine && (
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground mb-0.5">
                            {m.senderName}
                          </p>
                        )}
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1 text-right">
                          {formatDate(m.createdAt)}
                        </p>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          <div className="space-y-2 pt-1 border-t border-border/60">
            <Label>Your message</Label>
            <Textarea
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              placeholder="Type a message…"
              rows={3}
            />
            <Button
              className="w-full gap-2"
              onClick={() => {
                if (activeConversationId == null) return;
                const body = messageDraft.trim();
                if (!body) return;
                sendMessageMutation.mutate({ conversationId: activeConversationId, body });
                setMessageDraft("");
              }}
              disabled={sendMessageMutation.isPending || activeConversationId == null}
              type="button"
            >
              {sendMessageMutation.isPending ? "Sending…" : "Send"}
            </Button>
            {user && (
              <p className="text-xs text-center text-muted-foreground">
                All private chats also appear in{" "}
                <Link href="/inbox" className="text-primary hover:underline">
                  Inbox
                </Link>
              </p>
            )}
          </div>
        </div>
      </Dialog>
    </Layout>
  );
}
