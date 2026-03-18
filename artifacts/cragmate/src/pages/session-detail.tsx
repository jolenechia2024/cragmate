import { Layout } from "@/components/layout";
import { Card, Button, Dialog, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { useGetSession, useListClimbs, useCreateClimb, useDeleteClimb, getListClimbsQueryKey, getGetSessionQueryKey, useDeleteSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Trash2, MountainSnow } from "lucide-react";
import { Link } from "wouter";

const climbSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  gradeSystem: z.string().min(1, "System is required"),
  style: z.string().optional(),
  sent: z.boolean(),
  attempts: z.coerce.number().min(1).optional(),
  notes: z.string().optional(),
});

export default function SessionDetail() {
  const [, params] = useRoute("/sessions/:id");
  const sessionId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: session, isLoading: sessionLoading } = useGetSession(sessionId);
  const { data: climbs, isLoading: climbsLoading } = useListClimbs(sessionId);
  
  const createMutation = useCreateClimb({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClimbsQueryKey(sessionId) });
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        setIsDialogOpen(false);
        reset();
      }
    }
  });

  const deleteClimbMutation = useDeleteClimb({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClimbsQueryKey(sessionId) });
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
      }
    }
  });

  const deleteSessionMutation = useDeleteSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey({ userId }) });
        setLocation("/sessions");
      }
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof climbSchema>>({
    resolver: zodResolver(climbSchema),
    defaultValues: {
      sent: true,
      attempts: 1,
      gradeSystem: "V-Scale"
    }
  });

  const onSubmit = (data: z.infer<typeof climbSchema>) => {
    createMutation.mutate({ sessionId, data });
  };

  const handleDeleteSession = () => {
    if (confirm("Are you sure you want to delete this entire session?")) {
      deleteSessionMutation.mutate({ id: sessionId });
    }
  };

  if (sessionLoading) return <Layout><div className="animate-pulse h-64 bg-card rounded-xl" /></Layout>;
  if (!session) return <Layout><div>Session not found</div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/sessions" className="inline-flex items-center gap-2 text-primary hover:underline font-semibold uppercase tracking-wider text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Logs
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-5xl font-display uppercase tracking-widest mb-1">{session.gymName}</h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              {formatDate(session.date)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDeleteSession} disabled={deleteSessionMutation.isPending}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>Log Climb</Button>
          </div>
        </div>
        {session.notes && (
          <p className="mt-4 text-stone-400 bg-stone-900 p-4 rounded-lg border border-stone-800 italic">
            "{session.notes}"
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="p-6 bg-gradient-to-br from-stone-900 to-stone-950">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Climbs</p>
          <p className="text-5xl font-display text-white">{session.climbCount}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-stone-900 to-stone-950">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Top Grade</p>
          <p className="text-5xl font-display text-primary">{session.topGrade || '-'}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-stone-900 to-stone-950">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Sends</p>
          <p className="text-5xl font-display text-green-500">
            {climbs?.filter(c => c.sent).length || 0}
          </p>
        </Card>
      </div>

      <h2 className="text-3xl font-display uppercase tracking-widest mb-6">Ascent Log</h2>
      
      {climbsLoading ? (
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : climbs?.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <MountainSnow className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground">No climbs logged yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {climbs?.map(climb => (
            <Card key={climb.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center flex-col shadow-inner">
                  <span className="font-display text-2xl leading-none">{climb.grade}</span>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {climb.sent ? (
                      <Badge variant="success" className="gap-1"><Check className="w-3 h-3"/> Sent</Badge>
                    ) : (
                      <Badge variant="warning" className="gap-1"><X className="w-3 h-3"/> Project</Badge>
                    )}
                    {climb.style && <span className="text-sm font-semibold text-muted-foreground uppercase">{climb.style}</span>}
                  </div>
                  {climb.notes && <p className="text-sm text-stone-400 mt-1">{climb.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-6 md:border-l md:border-border md:pl-6">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Attempts</p>
                  <p className="font-display text-2xl">{climb.attempts || 1}</p>
                </div>
                <button 
                  onClick={() => deleteClimbMutation.mutate({ id: climb.id })}
                  className="text-stone-600 hover:text-destructive transition-colors p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Log Climb">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Grade System</Label>
              <Select {...register("gradeSystem")}>
                <option value="V-Scale">V-Scale</option>
                <option value="Font">Font</option>
                <option value="Color">Gym Color</option>
              </Select>
            </div>
            <div>
              <Label>Grade</Label>
              <Input placeholder="e.g. V4" {...register("grade")} />
              {errors.grade && <p className="text-destructive text-sm mt-1">{errors.grade.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Style</Label>
              <Select {...register("style")}>
                <option value="">Select style...</option>
                <option value="Slab">Slab</option>
                <option value="Overhang">Overhang</option>
                <option value="Vertical">Vertical</option>
                <option value="Dynamic">Dynamic/Coordination</option>
                <option value="Crimpy">Crimpy</option>
              </Select>
            </div>
            <div>
              <Label>Attempts</Label>
              <Input type="number" min="1" {...register("attempts")} />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 cursor-pointer bg-stone-900 p-4 rounded-lg border border-stone-800">
              <input type="checkbox" className="w-5 h-5 accent-primary" {...register("sent")} />
              <span className="text-base text-foreground">Did you send it?</span>
            </Label>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea placeholder="Beta, thoughts, crux..." {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Save Climb"}
          </Button>
        </form>
      </Dialog>
    </Layout>
  );
}
