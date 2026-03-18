import { Layout } from "@/components/layout";
import { Button, Card, Dialog, Label, Textarea } from "@/components/ui";
import { useAuth } from "@/auth/AuthProvider";
import { cn, formatDate } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle } from "lucide-react";

type InboxConversation = {
  id: number;
  postId?: number;
  otherUserId: string;
  otherUserName: string;
  lastMessage?: { body: string; createdAt: string; senderName: string };
};

type ConversationMessage = {
  id: number;
  conversationId: number;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export default function Inbox() {
  const queryClient = useQueryClient();
  const { userId, user, session } = useAuth();
  const accessToken = session?.access_token;
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  if (!user) {
    return (
      <Layout>
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-widest mb-2">Inbox</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Your private messages.</p>
        </div>
        <Card className="p-10 border-dashed border-primary/20 text-center">
          <MessageCircle className="w-16 h-16 text-primary mx-auto mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
          <h3 className="text-2xl font-display uppercase mb-2">Login required</h3>
          <p className="text-muted-foreground">
            Inbox and direct messages are only available when you’re logged in.
          </p>
        </Card>
      </Layout>
    );
  }

  const inboxQuery = useQuery({
    queryKey: ["inbox", userId],
    enabled: Boolean(user && session?.access_token),
    queryFn: async () => {
      const res = await fetch(`/api/inbox?userId=${encodeURIComponent(userId)}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to load inbox");
      }
      return (await res.json()) as InboxConversation[];
    },
  });

  const messagesQuery = useQuery({
    queryKey: ["conversationMessages", activeConversationId, userId],
    enabled: activeConversationId != null && Boolean(user && session?.access_token),
    queryFn: async () => {
      const res = await fetch(
        `/api/conversations/${activeConversationId}/messages?userId=${encodeURIComponent(userId)}`,
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to load messages");
      }
      return (await res.json()) as ConversationMessage[];
    },
  });

  const sendMutation = useMutation({
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

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-widest mb-2">Inbox</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Your private messages.</p>
        </div>
      </div>

      {inboxQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : inboxQuery.isError ? (
        <Card className="p-6">
          <p className="text-destructive">{(inboxQuery.error as Error).message}</p>
        </Card>
      ) : (inboxQuery.data ?? []).length === 0 ? (
        <Card className="p-12 text-center border-dashed border-primary/20">
          <MessageCircle className="w-16 h-16 text-primary mx-auto mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
          <h3 className="text-2xl font-display uppercase mb-2">No conversations yet</h3>
          <p className="text-muted-foreground">Message someone from Partner Finder to start.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(inboxQuery.data ?? []).map((c) => (
            <Card key={c.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display uppercase tracking-wider text-lg truncate">
                    {c.otherUserName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.lastMessage
                      ? `Last: ${c.lastMessage.senderName} · ${formatDate(c.lastMessage.createdAt)}`
                      : "No messages yet"}
                  </p>
                  {c.lastMessage?.body ? (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {c.lastMessage.body}
                    </p>
                  ) : null}
                </div>
                <Button variant="outline" onClick={() => setActiveConversationId(c.id)}>
                  Open
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={activeConversationId != null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveConversationId(null);
            setDraft("");
          }
        }}
        title="Conversation"
      >
        <div className="space-y-4">
          {messagesQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading messages…</div>
          ) : messagesQuery.isError ? (
            <div className="text-sm text-destructive">{(messagesQuery.error as Error).message}</div>
          ) : (
            <div className="max-h-[45vh] overflow-auto space-y-3 rounded-lg border border-border p-3 bg-card/30">
              {(messagesQuery.data ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No messages yet.</div>
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
            />
            <Button
              className="w-full"
              onClick={() => {
                if (activeConversationId == null) return;
                const body = draft.trim();
                if (!body) return;
                sendMutation.mutate({ conversationId: activeConversationId, body });
                setDraft("");
              }}
              disabled={sendMutation.isPending || activeConversationId == null}
              type="button"
            >
              {sendMutation.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </Dialog>
    </Layout>
  );
}

