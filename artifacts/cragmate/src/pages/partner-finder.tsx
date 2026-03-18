import { Layout } from "@/components/layout";
import { Card, Button, Dialog, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { useListPartnerPosts, useCreatePartnerPost, useListGyms, getListPartnerPostsQueryKey, useDeletePartnerPost } from "@workspace/api-client-react";
import { USER_ID, formatDate } from "@/lib/utils";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Calendar, Clock, Trash2, User } from "lucide-react";

const postSchema = z.object({
  gymId: z.coerce.number().min(1, "Gym is required"),
  sessionDate: z.string().min(1, "Date is required"),
  sessionTime: z.string().optional(),
  gradeRange: z.string().min(1, "Grade range is required"),
  message: z.string().optional(),
});

export default function PartnerFinder() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: posts, isLoading } = useListPartnerPosts();
  const { data: gyms } = useListGyms();
  
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

  const onSubmit = (data: z.infer<typeof postSchema>) => {
    createMutation.mutate({ 
      data: { 
        ...data, 
        userId: USER_ID,
        userName: "Guest Climber"
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
                {post.userId === USER_ID && (
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
                <Button variant="outline" className="w-full">Message (Coming Soon)</Button>
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
    </Layout>
  );
}
