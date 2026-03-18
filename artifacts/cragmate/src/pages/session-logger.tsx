import { Layout } from "@/components/layout";
import { Card, Button, Dialog, Input, Label, Select, Textarea } from "@/components/ui";
import { useListSessions, useCreateSession, useListGyms, getListSessionsQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { Link } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Activity } from "lucide-react";

const sessionSchema = z.object({
  gymId: z.coerce.number().min(1, "Please select a gym"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export default function SessionLogger() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: sessionsRaw, isLoading } = useListSessions({ userId });
  const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : [];
  const { data: gyms } = useListGyms();
  
  const createMutation = useCreateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey({ userId }) });
        setIsDialogOpen(false);
        reset();
      }
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = (data: z.infer<typeof sessionSchema>) => {
    createMutation.mutate({ data: { ...data, userId } });
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-5xl font-display uppercase tracking-widest mb-2">Session Log</h1>
          <p className="text-muted-foreground text-lg">Track your ascents and measure progress.</p>
        </div>
        <Button size="lg" onClick={() => setIsDialogOpen(true)} className="gap-2 w-full md:w-auto">
          <Plus className="w-5 h-5" /> Log Session
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-primary/20">
          <Activity className="w-16 h-16 text-primary mx-auto mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
          <h3 className="text-2xl font-display uppercase mb-2">No sessions yet</h3>
          <p className="text-muted-foreground mb-6">Hit the crag and log your first session.</p>
          <Button onClick={() => setIsDialogOpen(true)}>Start Logging</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(session => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <Card className="h-full hover:border-primary/80 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="p-6 flex flex-col h-full relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold font-display uppercase tracking-wider group-hover:text-primary transition-colors drop-shadow-sm">
                      {session.gymName}
                    </h3>
                    <span className="bg-teal-950 border border-teal-900/50 text-teal-300 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 shadow-sm">
                      <Calendar className="w-3 h-3" /> {formatDate(session.date)}
                    </span>
                  </div>
                  
                  {session.notes && (
                    <p className="text-muted-foreground text-sm mb-6 line-clamp-2 italic">"{session.notes}"</p>
                  )}
                  
                  <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Climbs</p>
                      <p className="text-2xl font-display">{session.climbCount}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Top Grade</p>
                      <p className="text-2xl font-display text-primary drop-shadow-[0_0_5px_rgba(0,212,170,0.3)]">{session.topGrade || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Log New Session">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label>Gym</Label>
            <Select {...register("gymId")}>
              <option value="">Select a gym</option>
              {gyms?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
            {errors.gymId && <p className="text-destructive text-sm mt-1">{errors.gymId.message}</p>}
          </div>
          
          <div>
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
            {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
          </div>
          
          <div>
            <Label>Notes (Optional)</Label>
            <Textarea placeholder="How did you feel today?" {...register("notes")} />
          </div>
          
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Create Session"}
          </Button>
        </form>
      </Dialog>
    </Layout>
  );
}
