import { Layout } from "@/components/layout";
import { Card, Input, Badge, Button } from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { useListGyms, type Gym } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Clock, ExternalLink, Calendar, Sparkles, GraduationCap } from "lucide-react";

function formatUpdatedAt(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const BRAND_INSTAGRAM_FALLBACK: Record<string, string> = {
  "Boulder Movement": "https://www.instagram.com/bouldermovement/",
  "Climb Central": "https://www.instagram.com/climbcentral/",
  "BFF Climb": "https://www.instagram.com/bffclimb/",
  "Boulder+": "https://www.instagram.com/boulderplusclimbing/",
  "Fit Bloc": "https://www.instagram.com/fitbloc/",
  "Ground Up Climbing": "https://www.instagram.com/groundupclimbing/",
};

function readBeginnersQuery(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("beginners") === "1";
}

export default function GymDashboard() {
  const { data: gyms, isLoading } = useListGyms();
  const [loc] = useLocation();
  const [search, setSearch] = useState("");
  const [beginnerOnly, setBeginnerOnly] = useState(readBeginnersQuery);
  const [expandedGymIds, setExpandedGymIds] = useState<Set<number>>(new Set());
  const [expandedBeginnerNoteGymIds, setExpandedBeginnerNoteGymIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setBeginnerOnly(readBeginnersQuery());
  }, [loc]);

  const setBeginnerFilter = (checked: boolean) => {
    setBeginnerOnly(checked);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (checked) url.searchParams.set("beginners", "1");
    else url.searchParams.delete("beginners");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  const formatPrice = (value?: number) => (value == null ? null : `$${value.toFixed(2)}`);

  const normalizedSearch = search.trim().toLowerCase();

  const gymsArray = Array.isArray(gyms) ? gyms : [];

  const gymsWithBrand = gymsArray.map((g) => ({
    ...g,
    brand: g.brand || g.name.split(" @")[0]?.trim() || g.name,
  }));

  const filteredGyms = gymsWithBrand.filter((g) => {
    const matchesSearch =
      normalizedSearch === "" ||
      g.name.toLowerCase().includes(normalizedSearch) ||
      g.brand.toLowerCase().includes(normalizedSearch) ||
      g.location.toLowerCase().includes(normalizedSearch) ||
      g.nearestMrt.toLowerCase().includes(normalizedSearch);
    const matchesBeginner = !beginnerOnly || g.beginnerFriendly === true;
    return matchesSearch && matchesBeginner;
  });

  const grouped = filteredGyms.reduce<Record<string, Gym[]>>((acc, g) => {
    (acc[g.brand] ||= []).push(g);
    return acc;
  }, {});

  const brandGroups = Object.entries(grouped)
    .map(([brand, outlets]) => ({
      brand,
      outlets: outlets.sort((a, b) => a.name.localeCompare(b.name)),
      instagramUrl:
        outlets.find((o) => o.instagramUrl)?.instagramUrl ?? BRAND_INSTAGRAM_FALLBACK[brand],
      imageUrl: outlets.find((o) => o.imageUrl)?.imageUrl,
    }))
    .sort((a, b) => {
      const bySize = (b.outlets?.length ?? 0) - (a.outlets?.length ?? 0);
      if (bySize !== 0) return bySize;
      return a.brand.localeCompare(b.brand);
    });

  const toggleExpanded = (id: number) => {
    setExpandedGymIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBeginnerNoteExpanded = (id: number) => {
    setExpandedBeginnerNoteGymIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-widest mb-2">Local Gyms</h1>
        <p className="text-muted-foreground text-base sm:text-lg">Compare passes, locations, and reset schedules.</p>
      </div>

      <div className="flex flex-col w-full gap-3 mb-8 md:flex-row md:items-stretch md:gap-4">
        <div className="relative w-full md:flex-1 md:max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
          <Input
            placeholder="Search by name, location, MRT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 text-lg h-14 bg-card shadow-lg border-primary/20 focus-visible:shadow-[0_0_15px_rgba(0,212,170,0.1)]"
          />
        </div>
        <label
          htmlFor="gym-beginner-filter"
          className="flex w-full md:w-auto md:min-w-[280px] items-center gap-3 h-14 shrink-0 rounded-xl border border-primary/20 bg-card px-4 shadow-lg cursor-pointer select-none hover:border-primary/35 transition-colors"
        >
          <Checkbox
            id="gym-beginner-filter"
            checked={beginnerOnly}
            onCheckedChange={(v) => setBeginnerFilter(v === true)}
            className="h-5 w-5 border-primary"
          />
          <span className="text-lg font-semibold text-foreground inline-flex items-center gap-2 leading-none">
            <GraduationCap className="w-5 h-5 text-primary shrink-0" />
            Beginner friendly!
          </span>
        </label>
      </div>

      <Card className="mb-8 p-4 border-primary/20 bg-card/60">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Beginner friendly tags</p>
            <p className="text-muted-foreground mt-1">
              Outlets with the badge include <strong className="text-foreground">Community insights</strong> based on recommendations from the climbing community.
            </p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-80 bg-card rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {brandGroups.map((group) => (
            <Card key={group.brand} className="overflow-hidden">
              <div className="h-36 bg-teal-950 relative overflow-hidden">
                <img
                  src={group.imageUrl || `https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200&q=80&auto=format&fit=crop`}
                  alt={group.brand}
                  loading="lazy"
                  className="w-full h-full object-cover opacity-60"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === "1") return;
                    img.dataset.fallbackApplied = "1";
                    img.src = "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200&q=80&auto=format&fit=crop";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                  <h3 className="text-2xl sm:text-3xl font-display uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] break-words">
                    {group.brand}
                  </h3>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                {group.outlets.map((gym) => {
                  const updatedAtLabel = formatUpdatedAt(gym.routesetScheduleUpdatedAt);
                  const isExpanded = expandedGymIds.has(gym.id);
                  const isBeginnerNoteExpanded = expandedBeginnerNoteGymIds.has(gym.id);
                  const hasRoutesetText = Boolean(gym.routesetSchedule?.extractedText);
                  const checkUrl =
                    group.instagramUrl ||
                    gym.instagramUrl ||
                    gym.routesetSchedule?.sourceUrl ||
                    gym.website;

                  return (
                    <div key={gym.id} className="rounded-xl border border-border p-3 sm:p-4 bg-card/30">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display uppercase tracking-wider text-base sm:text-lg truncate">
                            {gym.name}
                          </p>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-start gap-3">
                              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-sm text-foreground">{gym.location}</p>
                                <p className="text-xs text-muted-foreground">MRT: {gym.nearestMrt}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-xs text-muted-foreground">{gym.openingHours}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                          {gym.website && (
                            <Button
                              className="w-full sm:w-auto"
                              variant="outline"
                              onClick={() => window.open(gym.website, "_blank")}
                            >
                              Website <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                          )}
                          {checkUrl && (
                            <Button className="w-full sm:w-auto" onClick={() => window.open(checkUrl, "_blank")}>
                              Check routeset <Calendar className="w-4 h-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {gym.beginnerFriendly && (
                        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">
                              Community insights
                            </p>
                            <button
                              type="button"
                              onClick={() => toggleBeginnerNoteExpanded(gym.id)}
                              className="text-xs text-primary underline underline-offset-4 hover:text-primary/80 shrink-0"
                            >
                              {isBeginnerNoteExpanded ? "Show less" : "Show more"}
                            </button>
                          </div>
                          <p
                            className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-line break-words ${
                              isBeginnerNoteExpanded ? "" : "line-clamp-3"
                            }`}
                          >
                            {gym.beginnerNotes ??
                              "Tagged from public listing—open Website above to confirm current offers and facilities."}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {gym.beginnerFriendly && (
                          <Badge variant="default" className="bg-primary/20 text-primary border border-primary/40">
                            <GraduationCap className="w-3.5 h-3.5 mr-1" />
                            Beginner friendly
                          </Badge>
                        )}
                        <Badge variant="default" className="bg-teal-950 border border-teal-900">
                          Day pass: {formatPrice(gym.dayPassPrice) ?? "N/A"}
                        </Badge>
                        {formatPrice(gym.membershipPrice) && (
                          <Badge variant="default" className="bg-teal-950 border border-teal-900">
                            10 multipass: {formatPrice(gym.membershipPrice)}
                          </Badge>
                        )}
                        {updatedAtLabel && (
                          <Badge variant="default" className="bg-transparent border border-primary/30 text-primary">
                            Routeset updated: {updatedAtLabel}
                          </Badge>
                        )}
                      </div>

                      {(gym.routesetSchedule?.extractedText || gym.routesetScheduleUpdatedAt) && (
                        <div className="mt-4 rounded-lg border border-border bg-card/40 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="w-4 h-4 text-primary" />
                              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                Route setting{updatedAtLabel ? ` · updated ${updatedAtLabel}` : ""}
                              </p>
                            </div>
                            {hasRoutesetText && (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(gym.id)}
                                className="text-xs text-primary underline underline-offset-4 hover:text-primary/80 shrink-0"
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            )}
                          </div>
                          {gym.routesetSchedule?.extractedText ? (
                            <p className={`text-xs text-muted-foreground whitespace-pre-line break-words ${isExpanded ? "" : "line-clamp-4"}`}>
                              {gym.routesetSchedule.extractedText}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Schedule not published on the site.</p>
                          )}
                          {gym.routesetSchedule?.sourceUrl && (
                            <button
                              className="mt-2 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                              onClick={() => window.open(gym.routesetSchedule!.sourceUrl!, "_blank")}
                              type="button"
                            >
                              View source
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          {brandGroups.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground space-y-2">
              <p>
                {beginnerOnly
                  ? "No outlets match your filters with \"Beginner friendly!\" enabled. Try turning it off or broadening your search."
                  : "No gyms found matching your search."}
              </p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
