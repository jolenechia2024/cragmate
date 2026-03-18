import { Layout } from "@/components/layout";
import { Button } from "@/components/ui";
import { Link } from "wouter";
import { Mountain } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 bg-stone-900 border-2 border-stone-800 rounded-full flex items-center justify-center mb-8 shadow-2xl">
          <Mountain className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-8xl font-display uppercase text-white mb-2">404</h1>
        <h2 className="text-2xl font-bold tracking-widest uppercase text-muted-foreground mb-8">Off Route</h2>
        <p className="text-stone-400 max-w-md mb-8">
          You've climbed too far off the path. The route you're looking for doesn't exist or has been stripped.
        </p>
        <Link href="/">
          <Button size="lg">Downclimb to Home</Button>
        </Link>
      </div>
    </Layout>
  );
}
