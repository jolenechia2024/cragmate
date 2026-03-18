import { Layout } from "@/components/layout";
import { Button } from "@/components/ui";
import { Link } from "wouter";
import { ArrowRight, Mountain, TrendingUp, Users } from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <div className="relative rounded-2xl overflow-hidden mb-12 bg-teal-950 border border-teal-900/30 shadow-[0_0_40px_rgba(0,212,170,0.05)]">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-texture.png`} 
            alt="Rock texture" 
            className="w-full h-full object-cover opacity-15 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10 p-8 md:p-16 lg:p-24 flex flex-col items-start max-w-3xl">
          <Badge className="mb-6 border border-primary text-primary bg-primary/10 shadow-[0_0_10px_rgba(0,212,170,0.2)]">BETA ACCESS</Badge>
          <h1 className="text-6xl md:text-8xl font-display uppercase leading-[0.85] text-white mb-6">
            Conquer <br/><span className="text-primary drop-shadow-[0_0_15px_rgba(0,212,170,0.4)]">The Crag</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl font-medium">
            The ultimate companion for climbers. Track your sessions, visualize your progress, find buddies, and convert grades across all systems with ease. 
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/sessions">
              <Button size="lg" className="gap-2">
                Log Your Session <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/gyms">
              <Button size="lg" variant="outline" className="gap-2">
                Explore Gyms
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-8 rounded-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] hover:border-primary/50 transition-all duration-300 group">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Mountain className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl font-display uppercase tracking-wider mb-3">Grade Converter</h3>
          <p className="text-muted-foreground">Seamlessly translate between V-scale, Font scale, and local gym color circuits in seconds.</p>
        </div>
        <div className="bg-card border border-border p-8 rounded-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] hover:border-primary/50 transition-all duration-300 group">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl font-display uppercase tracking-wider mb-3">Track Progress</h3>
          <p className="text-muted-foreground">Log every send and attempt. Watch your top grade rise with clear data visualizations.</p>
        </div>
        <div className="bg-card border border-border p-8 rounded-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] hover:border-primary/50 transition-all duration-300 group">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl font-display uppercase tracking-wider mb-3">Find Partners</h3>
          <p className="text-muted-foreground">No belay/climbing partner? No worries. Post your planned sessions and connect with the community!</p>
        </div>
      </div>
    </Layout>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold tracking-widest uppercase ${className}`}>
      {children}
    </span>
  );
}
