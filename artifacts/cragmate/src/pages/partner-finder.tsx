import { Layout } from "@/components/layout";
import { Card, Button, Dialog, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { useListPartnerPosts, useCreatePartnerPost, useListGyms, getListPartnerPostsQueryKey, useDeletePartnerPost } from "@workspace/api-client-react";
import { cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Calendar, Clock, Trash2, User } from "lucide-react";

const postSchema = z.object({
  gymId: z.coerce.number().min(1, "Gym is required"),
  sessionDate: z.string().min(1, "Date is required"),
  sessionTime: z.string().optional(),
  gradeRange: z.string().min(1, "Grade range is required"),
  message: z.string().optional(),
});

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

export default function PartnerFinder() {
  const queryClient = useQueryClient();
  const { userId, user, session } = useAuth();
  const accessToken = session?.access_token;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  
  const { data: postsRaw, isLoading } = useListPartnerPosts();
  const posts = Array.isArray(postsRaw) ? postsRaw : [];
  const { data: gymsRaw } = useListGyms();
  const gyms = Array.isArray(gymsRaw) ? gymsRaw : [];
  
  const createMutation = useCreatePartnerPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartnerPostsQueryKey() });
        setIsDialogOpen(false);
        reset();
      }
    }
  });

  const deleteMutation = useDeletePartnerPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartnerPostsQueryKey() });
      }
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof postSchema>>({
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
    createMutation.mutate({ 
      data: { 
        ...data, 
        userId,
        userName: user?.email?.split("@")[0] ?? "Guest Climber"
      } 
    });
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-5xl font-display uppercase tracking-widest mb-2">Partner Finder</h1>
          <p className="text-muted-foreground text-lg">Need a belay or a projecting buddy? Post here.</p>
        </div>
        <Button size="lg" onClick={() => setIsDialogOpen(true)} className="gap-2 w-full md:w-auto">
          <Plus className="w-5 h-5" /> Post Session
        </Button>
      </div>

      {!user && (
        <Card className="p-4 mb-6 border-dashed border-primary/20">
          <p className="text-sm text-muted-foreground">
            Direct messages are <span className="text-foreground font-semibold">private</span> and require login.
            You can still browse posts in guest mode.
          </p>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : posts?.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-primary/20">
          <User className="w-16 h-16 text-primary mx-auto mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
          <h3 className="text-2xl font-display uppercase mb-2">No active posts</h3>
          <p className="text-muted-foreground mb-6">Be the first to look for a partner.</p>
          <Button onClick={() => setIsDialogOpen(true)}>Create Post</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts?.map(post => (
            <Card key={post.id} className="p-6 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.1)] transition-all duration-300">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary/30 group-hover:bg-primary transition-colors duration-300 shadow-[0_0_10px_rgba(0,212,170,0.5)]" />
              
              <div className="flex justify-between items-start mb-4 pl-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-950 flex items-center justify-center text-primary font-bold border border-primary/30 group-hover:border-primary transition-colors">
                    {post.userName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{post.userName}</h3>
                    <p className="text-xs text-muted-foreground">Posted {formatDate(post.createdAt)}</p>
                  </div>
                </div>
                {post.userId === userId && (
                  <button 
                    onClick={() => deleteMutation.mutate({ id: post.id })}
                    className="p-2 text-stone-500 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3 mb-6 bg-teal-950/20 p-4 rounded-lg border border-teal-900/30 pl-6 ml-2">
                <div className="flex items-center gap-2 text-stone-300">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-bold uppercase tracking-wider">{post.gymName}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-300">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{formatDate(post.sessionDate)} {post.sessionTime && `at ${post.sessionTime}`}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-300">
                  <Badge variant="warning">Grades: {post.gradeRange}</Badge>
                </div>
              </div>

              {post.message && (
                <p className="text-stone-400 italic pl-2 border-l-2 border-border ml-2 mb-4">"{post.message}"</p>
              )}
              
              <div className="mt-6 pl-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (!user) return;
                    setActivePostId(post.id);
                    setMessageDraft("");
                    conversationQuery.mutate({
                      postId: post.id,
                      otherUserId: post.userId,
                      otherUserName: post.userName,
                    });
                  }}
                  disabled={!user}
                >
                  Message
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Find a Partner">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label>Gym</Label>
            <Select {...register("gymId")}>
              <option value="">Select gym...</option>
              {gyms?.map(g => (
               <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
            {errors.gymId && <p className="text-destructive text-sm mt-1">{errors.gymId.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" {...register("sessionDate")} />
              {errors.sessionDate && <p className="text-destructive text-sm mt-1">{errors.sessionDate.message}</p>}
            </div>
            <div>
              <Label>Time (Optional)</Label>
              <Input type="time" {...register("sessionTime")} />
            </div>
          </div>

          <div>
            <Label>Grade Range</Label>
            <Input placeholder="e.g. V3-V5, 6A-6C" {...register("gradeRange")} />
            {errors.gradeRange && <p className="text-destructive text-sm mt-1">{errors.gradeRange.message}</p>}
          </div>

          <div>
            <Label>Message (Optional)</Label>
            <Textarea placeholder="Looking for a belay partner, projecting the blue route..." {...register("message")} />
          </div>
          
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Posting..." : "Post Session"}
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
        title="Messages"
      >
        <div className="space-y-4">
          {conversationQuery.isPending ? (
            <div className="text-sm text-muted-foreground">Opening conversation…</div>
          ) : null}
          {messagesQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading messages…</div>
          ) : messagesQuery.isError ? (
            <div className="text-sm text-destructive">
              {(messagesQuery.error as Error).message}
            </div>
          ) : (
            <div className="max-h-[45vh] overflow-auto space-y-3 rounded-lg border border-border p-3 bg-card/30">
              {(messagesQuery.data ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No messages yet. Say hi.</div>
              ) : (
                (messagesQuery.data ?? [])
                  .slice()
                  .reverse()
                  .map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-lg border border-border p-3",
                        m.senderId === userId ? "bg-teal-950/20" : "bg-card/40",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {m.senderName}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {formatDate(m.createdAt)}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                        {m.body}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Your message</Label>
            <Textarea
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              placeholder="Type a message…"
            />
            <Button
              className="w-full"
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
          </div>
        </div>
      </Dialog>
    </Layout>
  );
}
