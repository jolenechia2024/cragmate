import { Layout } from "@/components/layout";
import { Card } from "@/components/ui";
import { useGetStats } from "@workspace/api-client-react";
import { useAuth } from "@/auth/AuthProvider";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Activity, Trophy, Flame, Target } from "lucide-react";
import { motion, useMotionValueEvent, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

function AnimatedCounter({ value, prefix = "" }: { value: number | string, prefix?: string }) {
  const [hasMounted, setHasMounted] = useState(false);
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
  const isString = typeof value === 'string';
  
  const spring = useSpring(0, { bounce: 0, duration: 2000 });
  const [display, setDisplay] = useState<string | number>(0);

  useMotionValueEvent(spring, "change", (current) => {
    if (!hasMounted) return;
    if (isString && Number.isNaN(numValue)) {
      setDisplay(value);
      return;
    }
    const rounded = Math.round(current);
    setDisplay(isString ? (value as string).replace(/[0-9.]+/, rounded.toString()) : rounded);
  });
  
  useEffect(() => {
    setHasMounted(true);
    if (!isNaN(numValue)) {
      spring.set(numValue);
    }
    // initialize immediately for non-numeric strings
    if (isString && Number.isNaN(numValue)) setDisplay(value);
  }, [spring, numValue]);
  
  return <motion.span>{hasMounted ? display : 0}</motion.span>;
}

export default function Progress() {
  const { userId } = useAuth();
  const { data: stats, isLoading } = useGetStats({ userId });

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-card rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="h-32 bg-card rounded-xl"/><div className="h-32 bg-card rounded-xl"/></div>
          <div className="h-64 bg-card rounded-xl" />
        </div>
      </Layout>
    );
  }

  const isValidStats =
    stats &&
    typeof stats === "object" &&
    Array.isArray((stats as any).sessionsByMonth) &&
    Array.isArray((stats as any).gradeDistribution) &&
    Array.isArray((stats as any).progressionOverTime);

  if (!isValidStats) {
    return (
      <Layout>
        <div>No stats available.</div>
      </Layout>
    );
  }

  // Teal and Green palette for charts
  const COLORS = ['#00d4aa', '#059669', '#10b981', '#34d399', '#6ee7b7'];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-5xl font-display uppercase tracking-widest mb-2">Progress</h1>
        <p className="text-muted-foreground text-lg">Your climbing journey in numbers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform duration-300 hover:shadow-[0_0_15px_rgba(0,212,170,0.1)] hover:border-primary/30">
          <Activity className="w-8 h-8 text-primary mb-2 drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Sessions</p>
          <p className="text-4xl font-display text-foreground"><AnimatedCounter value={stats.totalSessions} /></p>
        </Card>
        <Card className="p-6 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform duration-300 hover:shadow-[0_0_15px_rgba(0,212,170,0.1)] hover:border-primary/30">
          <Target className="w-8 h-8 text-emerald-400 mb-2 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Climbs</p>
          <p className="text-4xl font-display text-foreground"><AnimatedCounter value={stats.totalClimbs} /></p>
        </Card>
        <Card className="p-6 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform duration-300 hover:shadow-[0_0_15px_rgba(0,212,170,0.1)] hover:border-primary/30">
          <Flame className="w-8 h-8 text-teal-400 mb-2 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Sends</p>
          <p className="text-4xl font-display text-foreground"><AnimatedCounter value={stats.totalSends} /></p>
        </Card>
        <Card className="p-6 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform duration-300 hover:shadow-[0_0_15px_rgba(0,212,170,0.1)] hover:border-primary/30">
          <Trophy className="w-8 h-8 text-yellow-400 mb-2 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Max Grade</p>
          <p className="text-4xl font-display text-primary drop-shadow-[0_0_5px_rgba(0,212,170,0.3)]">{stats.topGradeEver || 'N/A'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="p-6">
          <h3 className="text-xl font-display uppercase tracking-widest mb-6">Top Grade Over Time</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={stats.progressionOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#134e4a" vertical={false} />
                <XAxis dataKey="date" stroke="#99f6e4" tick={{ fill: '#99f6e4', fontSize: 12 }} />
                <YAxis stroke="#99f6e4" tick={{ fill: '#99f6e4', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#042f2e', border: '1px solid #0f766e', borderRadius: '8px' }}
                  labelStyle={{ color: '#ccfbf1' }}
                />
                <Line type="monotone" dataKey="gradeNumeric" stroke="#00d4aa" strokeWidth={3} dot={{ r: 4, fill: '#00d4aa' }} activeDot={{ r: 6, fill: '#fff', stroke: '#00d4aa', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-display uppercase tracking-widest mb-6">Sessions by Month</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.sessionsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#134e4a" vertical={false} />
                <XAxis dataKey="month" stroke="#99f6e4" tick={{ fill: '#99f6e4', fontSize: 12 }} />
                <YAxis stroke="#99f6e4" tick={{ fill: '#99f6e4', fontSize: 12 }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#0f766e', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#042f2e', border: '1px solid #0f766e', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#00d4aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-8">
        <h3 className="text-xl font-display uppercase tracking-widest mb-6">Grade Distribution</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={stats.gradeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="count"
                nameKey="grade"
                label={({ grade, count }) => `${grade} (${count})`}
                labelLine={{ stroke: '#99f6e4' }}
              >
                {stats.gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#042f2e', border: '1px solid #0f766e', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Layout>
  );
}
