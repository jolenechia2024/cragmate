import { db, gymsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as cheerio from "cheerio";

type GymTarget = {
  name: string;
  websiteUrl: string;
  routesetUrlCandidates?: string[];
};

const TARGETS: GymTarget[] = [
  {
    name: "Boulder+ @ Aperia Mall",
    websiteUrl: "https://www.boulderplusclimbing.com/location",
  },
  {
    name: "Boulder+ @ Chevrons",
    websiteUrl: "https://www.boulderplusclimbing.com/location",
  },
  {
    name: "Fit Bloc @ Kent Ridge (Science Park)",
    websiteUrl: "https://fitbloc.com/kr-facilities/",
  },
  {
    name: "Fit Bloc @ Depot Heights",
    websiteUrl: "https://fitbloc.com/locate/",
  },
  {
    name: "BFF Climb @ Bendemeer (CT Hub)",
    websiteUrl: "https://bffclimb.com",
  },
  {
    name: "BFF Climb @ Our Tampines Hub",
    websiteUrl: "https://bffclimb.com",
  },
  {
    name: "BFF Climb @ Tampines yo:HA",
    websiteUrl: "https://bffclimb.com",
  },
  {
    name: "Ground Up Climbing",
    websiteUrl: "https://www.groundupsg.com",
    routesetUrlCandidates: [
      "https://climbgroundup.com/route-setting/",
      "https://www.groundupsg.com/route-setting/",
      "https://www.groundupsg.com/route-setting",
    ],
  },
  {
    name: "Climb Central @ Kallang Wave Mall",
    websiteUrl: "https://www.climbcentral.sg",
  },
  {
    name: "Climb Central @ Novena (Velocity)",
    websiteUrl: "https://www.climbcentral.sg",
  },
  {
    name: "Climb Central @ Funan",
    websiteUrl: "https://www.climbcentral.sg",
  },
  {
    name: "Climb Central @ Katong (i12)",
    websiteUrl: "https://www.climbcentral.sg",
  },
  {
    name: "Boulder Movement @ Downtown",
    websiteUrl: "https://www.boulderm.com/locations/our-gyms/downtown",
    routesetUrlCandidates: ["https://www.boulderm.com/locations/routeset-schedule"],
  },
  {
    name: "Boulder Movement @ Tai Seng",
    websiteUrl: "https://www.boulderm.com/locations/our-gyms/tai-seng",
    routesetUrlCandidates: ["https://www.boulderm.com/locations/routeset-schedule"],
  },
  {
    name: "Boulder Movement @ Rochor (Tekka Place)",
    websiteUrl: "https://www.boulderm.com/locations/our-gyms/rochor",
    routesetUrlCandidates: ["https://www.boulderm.com/locations/routeset-schedule"],
  },
  {
    name: "Boulder Movement @ Bugis+",
    websiteUrl: "https://www.boulderm.com/locations/our-gyms/bugis",
    routesetUrlCandidates: ["https://www.boulderm.com/locations/routeset-schedule"],
  },
];

function absolutifyUrl(baseUrl: string, maybeRelative: string): string {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "CragMateBot/0.1 (+https://localhost) metadata sync; contact: local-dev",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

function extractOgImageUrl(html: string, baseUrl: string): string | undefined {
  const $ = cheerio.load(html);
  const og =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="og:image"]').attr("content") ??
    $('meta[property="og:image:url"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content");

  if (!og) return undefined;
  return absolutifyUrl(baseUrl, og.trim());
}

function extractFallbackImageUrl(html: string, baseUrl: string): string | undefined {
  const $ = cheerio.load(html);

  const candidates: Array<string | undefined> = [
    $('link[rel="apple-touch-icon"]').attr("href"),
    $('link[rel="apple-touch-icon-precomposed"]').attr("href"),
    $('link[rel="icon"][sizes]').attr("href"),
    $('link[rel="icon"]').attr("href"),
    $('link[rel="shortcut icon"]').attr("href"),
  ];

  for (const c of candidates) {
    if (c && c.trim()) return absolutifyUrl(baseUrl, c.trim());
  }

  // As a last resort, try a "hero"/banner-looking image.
  const img =
    $("img[class*='hero' i], img[class*='banner' i], img[id*='hero' i], img[id*='banner' i]")
      .first()
      .attr("src") ??
    $("img").first().attr("src");

  if (img && img.trim()) return absolutifyUrl(baseUrl, img.trim());
  return undefined;
}

function extractReadableText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  const text = $("body").text();
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

function pickRoutesetScheduleSnippet(text: string): string | undefined {
  const lines = text.split("\n");
  const keywords = ["route", "routes", "set", "setting", "reset", "routeset"];

  const hits: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (keywords.some((k) => l.includes(k))) hits.push(i);
  }
  if (!hits.length) return undefined;

  // Take a window around the first hit and keep it short.
  const start = Math.max(0, hits[0] - 10);
  const end = Math.min(lines.length, hits[0] + 25);
  const snippet = lines.slice(start, end).join("\n").trim();
  return snippet.length > 10 ? snippet : undefined;
}

async function bestEffortRoutesetSchedule(
  target: GymTarget,
): Promise<{ sourceUrl?: string; extractedText?: string }> {
  const candidates = [
    ...(target.routesetUrlCandidates ?? []),
    `${target.websiteUrl.replace(/\/$/, "")}/routeset`,
    `${target.websiteUrl.replace(/\/$/, "")}/route-setting`,
    `${target.websiteUrl.replace(/\/$/, "")}/routesetting`,
    `${target.websiteUrl.replace(/\/$/, "")}/schedule`,
  ];

  for (const url of candidates) {
    try {
      const html = await fetchHtml(url);
      const text = extractReadableText(html);
      const extractedText = pickRoutesetScheduleSnippet(text);
      if (extractedText) return { sourceUrl: url, extractedText };
    } catch {
      // ignore and continue
    }
  }

  return {};
}

async function main() {
  console.log(`Syncing metadata for ${TARGETS.length} gyms...`);

  let updated = 0;
  let missing = 0;

  for (const target of TARGETS) {
    const rows = await db
      .select()
      .from(gymsTable)
      .where(eq(gymsTable.name, target.name))
      .limit(1);

    const gym = rows[0];
    if (!gym) {
      console.warn(`Missing gym in DB: ${target.name}`);
      missing++;
      continue;
    }

    try {
      const homepageHtml = await fetchHtml(target.websiteUrl);
      const imageUrl =
        extractOgImageUrl(homepageHtml, target.websiteUrl) ??
        extractFallbackImageUrl(homepageHtml, target.websiteUrl);
      const routesetSchedule = await bestEffortRoutesetSchedule(target);

      await db
        .update(gymsTable)
        .set({
          imageUrl: imageUrl ?? gym.imageUrl ?? null,
          routesetSchedule:
            routesetSchedule.sourceUrl || routesetSchedule.extractedText
              ? routesetSchedule
              : gym.routesetSchedule ?? null,
          routesetScheduleUpdatedAt:
            routesetSchedule.sourceUrl || routesetSchedule.extractedText
              ? new Date()
              : gym.routesetScheduleUpdatedAt ?? null,
        })
        .where(eq(gymsTable.id, gym.id));

      console.log(`Updated: ${target.name}`);
      updated++;
    } catch (err) {
      console.warn(`Failed: ${target.name}`, err);
    }

    // be polite
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`Done. Updated=${updated}, Missing=${missing}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

