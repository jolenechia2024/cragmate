import { Layout } from "@/components/layout";
import { Card, Input, Badge, Button } from "@/components/ui";
import { useListGyms } from "@workspace/api-client-react";
import { useState } from "react";
import { Search, MapPin, Clock, DollarSign, ExternalLink } from "lucide-react";

export default function GymDashboard() {
  const { data: gyms, isLoading } = useListGyms();
  const [search, setSearch] = useState("");

  const filteredGyms = gyms?.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.location.toLowerCase().includes(search.toLowerCase()) ||
    g.nearestMrt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-5xl font-display uppercase tracking-widest mb-2">Local Gyms</h1>
        <p className="text-muted-foreground text-lg">Compare passes, locations, and reset schedules.</p>
      </div>

      <div className="relative mb-8 max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search by name, location, MRT..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 text-lg h-14 bg-card shadow-lg border-primary/20 focus-visible:shadow-[0_0_15px_rgba(0,212,170,0.1)]"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-80 bg-card rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGyms?.map(gym => (
            <Card key={gym.id} className="flex flex-col group hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,212,170,0.15)] hover:border-primary/50 transition-all duration-300">
              <div className="h-40 bg-teal-950 relative overflow-hidden">
                {/* gym interior view */}
                <img 
                  src={`https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80&auto=format&fit=crop`} 
                  alt={`${gym.name} interior`}
                  className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-3xl font-display uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-primary transition-colors">{gym.name}</h3>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="default" className="bg-teal-950 border border-teal-900">{gym.gradeSystem}</Badge>
                  {gym.routeSetDay && <Badge variant="warning">Resets: {gym.routeSetDay}</Badge>}
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3 text-stone-300">
                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{gym.location}</p>
                      <p className="text-sm text-muted-foreground">MRT: {gym.nearestMrt}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-stone-300">
                    <Clock className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm">{gym.openingHours}</span>
                  </div>

                  <div className="flex items-center gap-3 text-stone-300">
                    <DollarSign className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground">Day Pass: ${gym.dayPassPrice}</span>
                  </div>
                </div>

                {gym.website && (
                  <Button variant="outline" className="w-full mt-4" onClick={() => window.open(gym.website, '_blank')}>
                    Visit Website <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {filteredGyms?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No gyms found matching your search.
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
