import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui";
import { QUESTION_BANK, type ClimberType } from "@/lib/quiz-bank";
import { ArrowRight, Hand, Mountain, X } from "lucide-react";
import { motion, useMotionValue, useSpring } from "framer-motion";

type Section = {
  id: string;
  tag: string;
  title: string;
  sub: string;
  cta: string;
  href: string;
  accent: string;
  accentHex: number;
};

const SECTIONS: Section[] = [
  { id: "hero", tag: "Bouldering companion", title: "Conquer The Crag", sub: "The ultimate companion for climbers. Track your sessions, visualize your progress, find buddies, and convert grades with ease.", cta: "Log your session", href: "/sessions", accent: "#00d4aa", accentHex: 0x00d4aa },
  { id: "track", tag: "Feature 01", title: "Track Progress", sub: "Log every attempt and watch your climbing trend level up over time.", cta: "Open progress", href: "/progress", accent: "#ff4433", accentHex: 0xff4433 },
  { id: "grades", tag: "Feature 02", title: "Grade Converter", sub: "Translate grades across gyms quickly so sessions feel less confusing.", cta: "Convert grades", href: "/grades", accent: "#3399ff", accentHex: 0x3399ff },
  { id: "partners", tag: "Feature 03", title: "Find Partners", sub: "Post your session plans and connect with climbers at similar levels.", cta: "Find partners", href: "/partners", accent: "#ffcc00", accentHex: 0xffcc00 },
  { id: "contact", tag: "Get started", title: "Ready To Climb?", sub: "Explore gyms, check your inbox and keep every session moving forward.", cta: "Open gym dashboard", href: "/gyms", accent: "#ff8833", accentHex: 0xff8833 },
];

const WALL_THICKNESS = 0.6;
const GYM_PANELS = [
  { w: 6, h: 10, d: WALL_THICKNESS, x: -5.8, y: 0.4, z: 1.5, ry: 0.6 },
  { w: 8, h: 10, d: WALL_THICKNESS, x: 0, y: 0.4, z: 0, ry: 0 },
  { w: 6, h: 10, d: WALL_THICKNESS, x: 5.8, y: 0.4, z: 1.5, ry: -0.6 },
] as const;

const SECTION_X_ANCHORS = [-5.2, -2.2, 0, 2.2, 5.2] as const;
const SECTION_PANEL_IDX = [0, 0, 1, 2, 2] as const;
const VOLUME_CONFIGS: Array<{ p: number; u: number; v: number; scale: number; rot: [number, number, number] }> = [
  { p: 1, u: 0.2, v: 0.4, scale: 1.5, rot: [0.5, 0.2, 0.8] },
  { p: 0, u: 0.7, v: 0.6, scale: 2.2, rot: [0, 0, 1.2] },
  { p: 2, u: 0.3, v: 0.3, scale: 1.8, rot: [1.1, 0.4, 0] },
];

// Hero (section 0) / Track (1) pigments swapped: former-teal route is red, former-red route is teal.
// Glow pairs with UI: Feature 01 lights the red cluster; hero lights the teal cluster (see animate).
const SECTION_ROUTE_COLORS: number[][] = [
  [0xff4433, 0xff6655, 0xdd2211],
  [0x00d4aa, 0x00b88f, 0x00e8bb],
  [0x3399ff, 0x55aaff, 0x1177dd],
  [0xffcc00, 0xffdd33, 0xddaa00],
  [0xff8833, 0xffaa55, 0xdd6611],
];

function routeGlowsForActiveSection(routeSectionIdx: number, activeSec: number): boolean {
  if (activeSec === 0) return routeSectionIdx === 1;
  if (activeSec === 1) return routeSectionIdx === 0;
  return routeSectionIdx === activeSec;
}

type HoldKind = "jug" | "crimp" | "sloper" | "pinch" | "pocket";
type HoldDef = {
  pi: number;
  u: number;
  v: number;
  kind: HoldKind;
  s: number;
  sectionIdx: number;
  /** Pick from SECTION_ROUTE_COLORS[sectionIdx]; default 0. Used for extra teal variety only. */
  paletteVariant?: number;
};

/** Procedural footholds use fixed small scale; exclude from START/END label anchors. */
function isFootHoldDef(d: HoldDef): boolean {
  return d.s <= 0.48 && d.kind === "crimp";
}

/** Clicks/drags originating on HTML UI must not raycast the wall or start orbit-drag. */
function isInteractiveUiTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.("a,button,input,textarea,select,label,[role='button'],[role='tab'],[role='menuitem'],[role='checkbox'],[role='radio']");
}
type QuizState = Record<string, ClimberType>;
type RewardConfig = { color: number; puffIntensity: number };
const HOLD_KINDS: HoldKind[] = ["jug", "crimp", "sloper", "pinch", "pocket"];
const PANEL_PLACED_HOLDS = new Map<number, Array<{ u: number; v: number }>>();
const HOLD_DEFS_CORE: HoldDef[] = SECTIONS.flatMap((_, sectionIdx) => {
  const panelIdx = SECTION_PANEL_IDX[sectionIdx]!;
  const p = GYM_PANELS[panelIdx]!;
  const holdsPerRoute = 8;
  const holds: HoldDef[] = [];
  const placed = PANEL_PLACED_HOLDS.get(panelIdx) ?? [];
  const panelVolumes = VOLUME_CONFIGS.filter((v) => v.p === panelIdx);
  const MIN_DIST = 0.14;

  const isClearOfHoldsAndVolumes = (u: number, v: number) => {
    const clearOfHolds = placed.every((other) => {
      const du = u - other.u;
      const dv = v - other.v;
      return Math.sqrt(du * du + dv * dv) > MIN_DIST;
    });
    if (!clearOfHolds) return false;

    return panelVolumes.every((vol) => {
      const du = u - vol.u;
      const dv = v - vol.v;
      const volRadius = 0.1 + vol.scale * 0.02;
      const dist = Math.sqrt(du * du + dv * dv);
      if (dist < volRadius) return false; // avoid intersecting volumes
      if (Math.abs(du) < volRadius * 0.9 && v < vol.v + 0.03) return false; // never place below nearby volume
      return true;
    });
  };

  for (let i = 0; i < holdsPerRoute; i++) {
    let u = 0;
    let v = 0;
    let foundSpot = false;
    for (let attempts = 0; attempts < 28; attempts++) {
      const vBase = 0.1 + (i / holdsPerRoute) * 0.8;
      const uBase = 0.3 + rng(sectionIdx * 50 + i * 17 + attempts * 31) * 0.4;
      u = Math.max(0.06, Math.min(0.94, Math.round(uBase * 10) / 10));
      v = Math.max(0.06, Math.min(0.95, Math.round(vBase * 10) / 10));
      if (isClearOfHoldsAndVolumes(u, v)) {
        foundSpot = true;
        break;
      }
    }
    if (!foundSpot) continue;

    let size = 1.0 + rng(i + sectionIdx) * 1.5;
    if (i === 0 || i === holdsPerRoute - 1) size *= 1.8;

    const kinds: HoldKind[] = p.ry !== 0 ? ["crimp", "pinch", "pocket"] : ["jug", "sloper", "crimp"];
    const kind = kinds[Math.floor(rng(i * 123 + sectionIdx * 9) * kinds.length)] ?? HOLD_KINDS[0]!;
    holds.push({
      pi: panelIdx,
      u,
      v,
      kind,
      s: size,
      sectionIdx,
    });
    placed.push({ u, v });

    if (rng(i + sectionIdx * 13 + 99) > 0.4) {
      const footU = Math.max(0.06, Math.min(0.94, u + (rng(i + sectionIdx * 101) - 0.5) * 0.2));
      const footV = Math.max(0.06, Math.min(0.95, v - 0.1));
      if (isClearOfHoldsAndVolumes(footU, footV)) {
        holds.push({
          pi: panelIdx,
          u: footU,
          v: footV,
          kind: "crimp",
          s: 0.4,
          sectionIdx,
        });
        placed.push({ u: footU, v: footV });
      }
    }
  }
  PANEL_PLACED_HOLDS.set(panelIdx, placed);
  return holds;
});

function rng(seed: number): number {
  return ((Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
}

/** Extra holds on the Track (teal) line only — does not mutate core procedural defs from SECTIONS.flatMap. */
function generateExtraTealHoldDefs(coreDefs: HoldDef[]): HoldDef[] {
  const TEAL_SECTION_IDX = 1;
  const panelIdx = SECTION_PANEL_IDX[TEAL_SECTION_IDX]!;
  const placed: Array<{ u: number; v: number }> = coreDefs
    .filter((d) => d.pi === panelIdx)
    .map((d) => ({ u: d.u, v: d.v }));
  const panelVolumes = VOLUME_CONFIGS.filter((v) => v.p === panelIdx);
  const MIN_DIST = 0.14;
  const isClearOfHoldsAndVolumes = (u: number, v: number) => {
    const clearOfHolds = placed.every((other) => {
      const du = u - other.u;
      const dv = v - other.v;
      return Math.sqrt(du * du + dv * dv) > MIN_DIST;
    });
    if (!clearOfHolds) return false;
    return panelVolumes.every((vol) => {
      const du = u - vol.u;
      const dv = v - vol.v;
      const volRadius = 0.1 + vol.scale * 0.02;
      const dist = Math.sqrt(du * du + dv * dv);
      if (dist < volRadius) return false;
      if (Math.abs(du) < volRadius * 0.9 && v < vol.v + 0.03) return false;
      return true;
    });
  };
  // Track wall is the left panel (angled); match core route hold shapes for that panel.
  const kinds: HoldKind[] = ["crimp", "pinch", "pocket", "sloper"];
  const extraCount = 8;
  const out: HoldDef[] = [];
  for (let i = 0; i < extraCount; i++) {
    let u = 0;
    let v = 0;
    let foundSpot = false;
    for (let attempts = 0; attempts < 44; attempts++) {
      const vBase = 0.08 + rng(90210 + i * 97 + attempts * 13) * 0.84;
      const uBase = 0.12 + rng(90211 + i * 53 + attempts * 29) * 0.76;
      u = Math.max(0.06, Math.min(0.94, Math.round(uBase * 10) / 10));
      v = Math.max(0.06, Math.min(0.95, Math.round(vBase * 10) / 10));
      if (isClearOfHoldsAndVolumes(u, v)) {
        foundSpot = true;
        break;
      }
    }
    if (!foundSpot) continue;
    const size = 0.72 + rng(88000 + i * 11) * 1.5;
    const kind = kinds[Math.floor(rng(88100 + i * 3) * kinds.length)] ?? HOLD_KINDS[0]!;
    const paletteVariant = i % SECTION_ROUTE_COLORS[TEAL_SECTION_IDX]!.length;
    out.push({
      pi: panelIdx,
      u,
      v,
      kind,
      s: size,
      sectionIdx: TEAL_SECTION_IDX,
      paletteVariant,
    });
    placed.push({ u, v });
  }
  return out;
}

const HOLD_DEFS: HoldDef[] = [...HOLD_DEFS_CORE, ...generateExtraTealHoldDefs(HOLD_DEFS_CORE)];

const QUIZ_STORAGE_KEY = "cragmate_climber_quiz_v4";
const QUIZ_LENGTH = 10;

function shuffleAndPickN(total: number, n: number): number[] {
  const arr = Array.from({ length: total }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, n);
}

function computeType(axes: Array<{ key: string }>, nextQuiz: QuizState): ClimberType | "" {
  const values = axes.map((ax) => nextQuiz[ax.key]);
  if (values.some((v) => !v)) return "";
  const score: Record<ClimberType, number> = {
    Technician: 0,
    Explorer: 0,
    Strategist: 0,
    "Flow Climber": 0,
    Motivator: 0,
    Grinder: 0,
    "Risk-Taker": 0,
    "Calm Connector": 0,
  };
  values.forEach((v) => {
    if (v) score[v] += 1;
  });
  const priority: ClimberType[] = ["Risk-Taker", "Calm Connector", "Motivator", "Grinder", "Strategist", "Flow Climber", "Technician", "Explorer"];
  const best = Object.entries(score).sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : priority.indexOf(a[0] as ClimberType) - priority.indexOf(b[0] as ClimberType)))[0]?.[0] as ClimberType | undefined;
  return best ?? "";
}

function getResultBlurb(resultType: ClimberType | null): string | null {
  if (!resultType) return null;
  if (resultType === "Technician") return "All about details: tidy foot placements, clean body positions, and smart repeats.";
  if (resultType === "Explorer") return "Progress comes from variety - weird beta, new styles, and exploring different wall sections.";
  if (resultType === "Strategist") return "Plans beat panic: one clear target, tracked attempts, and steady progress through the session.";
  if (resultType === "Flow Climber") return "Best when movement feels smooth: rhythm, breathing, and timing over brute force.";
  if (resultType === "Motivator") return "Energy is fuel: a bit of hype and friendly noise can unlock moves that felt stuck.";
  if (resultType === "Grinder") return "Process-first: same climb, cleaner tries, small upgrades each burn until it clicks.";
  if (resultType === "Risk-Taker") return "Commits hard: big moves and less hesitation - learning curve includes some dramatic whips.";
  return "Steady under pressure: reads routes calmly, stays relaxed, and keeps composure on the wall.";
}

function getRewardConfig(type: ClimberType): RewardConfig {
  const map: Record<ClimberType, RewardConfig> = {
    Technician: { color: 0x3b95ff, puffIntensity: 0.9 },
    Explorer: { color: 0x00d4aa, puffIntensity: 1.15 },
    Strategist: { color: 0x4f7dff, puffIntensity: 0.95 },
    "Flow Climber": { color: 0x00e1b2, puffIntensity: 1.25 },
    Motivator: { color: 0xff5a33, puffIntensity: 1.9 },
    Grinder: { color: 0xffcc44, puffIntensity: 1.1 },
    "Risk-Taker": { color: 0xff4333, puffIntensity: 2.1 },
    "Calm Connector": { color: 0x4ad9c5, puffIntensity: 1.0 },
  };
  return map[type];
}

function holdWorldPos(panelIdx: number, u: number, v: number): THREE.Vector3 {
  const p = GYM_PANELS[panelIdx]!;
  const lx = (u - 0.5) * p.w;
  const ly = (v - 0.5) * p.h;
  // p.z is the wall front face, so keep holds/volumes on that surface.
  const vec = new THREE.Vector3(p.x + lx, p.y + ly, p.z + 0.07);
  if (p.ry !== 0) {
    const o = new THREE.Vector3(p.x, p.y, p.z);
    vec.sub(o).applyEuler(new THREE.Euler(0, p.ry, 0)).add(o);
  }
  return vec;
}

function drawCircularRouteTagCanvas(text: string, accentHex: number): HTMLCanvasElement {
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const hx = accentHex.toString(16).padStart(6, "0");
  const border = `#${hx}`;
  const cxb = size / 2;
  const cyb = size / 2;
  const ro = size * 0.44;

  ctx.save();
  ctx.shadowColor = border;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cxb, cyb, ro, 0, Math.PI * 2);
  ctx.strokeStyle = border;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cxb, cyb, ro - 4, 0, Math.PI * 2);
  ctx.fillStyle = "#070708";
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.stroke();

  const line = text.toUpperCase();
  const fontPx = line.length <= 1 ? 108 : line.length <= 4 ? 46 : 40;
  ctx.font = `900 ${fontPx}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = line.length <= 1 ? 7 : 4;
  ctx.lineJoin = "round";
  ctx.strokeText(line, cxb, cyb + 1);
  ctx.strokeStyle = border;
  ctx.lineWidth = line.length <= 1 ? 3 : 2;
  ctx.strokeText(line, cxb, cyb + 1);
  ctx.fillStyle = "#faf8f5";
  ctx.fillText(line, cxb, cyb + 1);

  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.arc(cxb, cyb, ro + 2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

type SceneBundle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  wallGroup: THREE.Group;
  holdGroups: THREE.Group[];
  holdSections: number[];
  volumeChipGlowMaterials: Array<{ sectionIdx: number; mat: THREE.MeshStandardMaterial }>;
  warmUpSpotlight: THREE.SpotLight;
  warmUpBar: THREE.Mesh;
  warmUpFrameMat: THREE.MeshStandardMaterial;
  warmUpBarMat: THREE.MeshStandardMaterial;
  triggerChalkReward: (type: ClimberType, spawnFromView?: boolean) => void;
  claimChalkReward: () => boolean;
  startClimbingSequence: () => boolean;
  syncChalkBagState: (status: "idle" | "reward_dropped" | "claimed" | "climbing", type: ClimberType | null) => void;
  updateEffects: (dt: number) => void;
  dispose: () => void;
};

const WALL_MAT_TOP_Y = -4.4;
const WARM_MAT_TOP_Y = -3.69;
const CHALK_BAG_HALF_HEIGHT = 0.56;
const CHALK_BAG_WALL_REST_Y = WALL_MAT_TOP_Y + CHALK_BAG_HALF_HEIGHT;
const CHALK_BAG_WARM_REST_Y = WARM_MAT_TOP_Y + CHALK_BAG_HALF_HEIGHT;

function buildScene(canvas: HTMLCanvasElement): SceneBundle {
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 600;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, Math.max(h, 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090807);
  scene.fog = new THREE.FogExp2(0x090807, 0.038);

  const camera = new THREE.PerspectiveCamera(52, w / Math.max(h, 1), 0.1, 90);
  camera.position.set(0, 1.4, 13.8);
  camera.lookAt(0, 0.3, 0);

  scene.add(new THREE.AmbientLight(0xfff4e0, 0.19));
  const key = new THREE.DirectionalLight(0xfff0d8, 3.25);
  key.position.set(3, 12, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0x88aacc, 0.26));

  const wallGroup = new THREE.Group();
  scene.add(wallGroup);

  const textures: THREE.Texture[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const wallCanvas = document.createElement("canvas");
  wallCanvas.width = 1024;
  wallCanvas.height = 1024;
  const ctx = wallCanvas.getContext("2d")!;
  ctx.fillStyle = "#b8a478";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 50000; i++) {
    const x = Math.floor(rng(i * 1.13 + 17) * 1024);
    const y = Math.floor(rng(i * 1.71 + 97) * 1024);
    const a = 0.02 + rng(i * 2.3 + 33) * 0.06;
    ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 150; i++) {
    const y = (i / 150) * 1024 + rng(i * 3) * 7;
    const a = 0.04 + rng(i * 7) * 0.12;
    ctx.strokeStyle = rng(i * 11) > 0.5 ? `rgba(60,38,8,${a})` : `rgba(200,170,95,${a * 0.6})`;
    ctx.lineWidth = 0.6 + rng(i * 5) * 2.0;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(256, y + rng(i * 2) * 8 - 4, 768, y + rng(i * 9) * 8 - 4, 1024, y + rng(i * 4) * 5 - 2);
    ctx.stroke();
  }
  for (let c = 0; c < 14; c++) for (let r = 0; r < 10; r++) {
    const cx = ((c + 0.5) / 14) * 1024 + (rng(c * 13 + r * 7) - 0.5) * 30;
    const cy = ((r + 0.5) / 10) * 1024 + (rng(r * 17 + c * 3) - 0.5) * 30;
    const radius = 9 + rng(c * 31 + r) * 4;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, "rgba(20,10,2,0.92)");
    g.addColorStop(1, "rgba(80,55,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    // Emphasize t-nut holes with a darker core + subtle ring.
    ctx.strokeStyle = "rgba(8,8,8,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, radius * 0.26), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(5,5,5,0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.8, radius * 0.14), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    const x = rng(i * 3.7 + 41) * 1024;
    const y = rng(i * 5.9 + 19) * 1024;
    const radius = 50 + rng(i * 7.1 + 57) * 100;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, "rgba(255,255,255,0.2)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  textures.push(wallTex);

  const makeWallMat = (pw: number, ph: number) => {
    const map = wallTex.clone();
    map.repeat.set(pw * 0.18, ph * 0.18);
    textures.push(map);
    const m = new THREE.MeshStandardMaterial({ map, roughness: 0.82, metalness: 0 });
    materials.push(m);
    return m;
  };

  const setupWarmUpZone = (targetScene: THREE.Scene) => {
    const group = new THREE.Group();
    const themeHex = SECTIONS[0]!.accentHex;
    const barFrameMat = new THREE.MeshStandardMaterial({
      color: themeHex,
      emissive: themeHex,
      emissiveIntensity: 0.38,
      roughness: 0.12,
      metalness: 0.78,
    });
    const barRailMat = new THREE.MeshStandardMaterial({
      color: themeHex,
      emissive: themeHex,
      emissiveIntensity: 0.28,
      metalness: 0.95,
      roughness: 0.06,
    });
    const weightMat = new THREE.MeshStandardMaterial({ color: 0x121317, roughness: 0.34, metalness: 0.9 });
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.72, metalness: 0.16 });
    const warmZoneMatMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.86, metalness: 0.05 });
    materials.push(barFrameMat, barRailMat, weightMat, benchMat, warmZoneMatMat);

    const postGeo = new THREE.BoxGeometry(0.2, 10, 0.2);
    geometries.push(postGeo);
    const leftPost = new THREE.Mesh(postGeo, barFrameMat);
    leftPost.position.set(-1.8, 0, 0);
    const rightPost = leftPost.clone();
    rightPost.position.set(1.8, 0, 0);
    const shortPostL = new THREE.Mesh(postGeo, barFrameMat);
    shortPostL.position.set(2.2, -1.6, 0);
    const shortPostR = new THREE.Mesh(postGeo, barFrameMat);
    shortPostR.position.set(5.8, -1.6, 0);

    const barGeo = new THREE.CylinderGeometry(0.055, 0.055, 3.6, 20);
    const shortBarGeo = new THREE.CylinderGeometry(0.055, 0.055, 3.6, 20);
    geometries.push(barGeo, shortBarGeo);
    const bar = new THREE.Mesh(barGeo, barRailMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 4.2, 0.36);
    bar.name = "pullup_bar";
    bar.userData.warmupTarget = true;
    bar.castShadow = true;
    const shortBar = new THREE.Mesh(shortBarGeo, barRailMat);
    shortBar.rotation.z = Math.PI / 2;
    shortBar.position.set(4.0, 2.6, 0.36);
    shortBar.name = "pullup_bar_secondary";
    shortBar.userData.warmupTarget = true;
    shortBar.castShadow = true;

    const spot = new THREE.SpotLight(0xffffff, 14, 44, Math.PI / 3.4, 0.28, 0.65);
    spot.position.set(0, 6, 2);
    spot.target = bar;
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0002;
    group.add(spot);
    const warmPoint = new THREE.PointLight(themeHex, 1.6, 16, 2);
    warmPoint.position.set(0, 2.4, 0.8);
    group.add(warmPoint);

    const dumbbell = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.78, 14);
    geometries.push(handleGeo);
    const handle = new THREE.Mesh(handleGeo, weightMat);
    handle.rotation.z = Math.PI / 2;
    dumbbell.add(handle);
    const plateGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.14, 18);
    geometries.push(plateGeo);
    const plateL = new THREE.Mesh(plateGeo, weightMat);
    plateL.rotation.z = Math.PI / 2;
    plateL.position.x = -0.33;
    const plateR = plateL.clone();
    plateR.position.x = 0.33;
    dumbbell.add(plateL, plateR);
    dumbbell.position.set(-1.35, -3.58, 0.75);
    dumbbell.rotation.y = 0.26;
    group.add(dumbbell);

    const kettlebellGeo = new THREE.SphereGeometry(0.32, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.92);
    geometries.push(kettlebellGeo);
    const kettlebell = new THREE.Mesh(kettlebellGeo, weightMat);
    kettlebell.position.set(1.28, -3.56, 0.88);
    const kbHandleGeo = new THREE.TorusGeometry(0.2, 0.04, 12, 18, Math.PI);
    geometries.push(kbHandleGeo);
    const kbHandle = new THREE.Mesh(kbHandleGeo, weightMat);
    kbHandle.position.set(1.28, -3.2, 0.88);
    group.add(kettlebell, kbHandle);

    const benchGeo = new THREE.BoxGeometry(2.25, 0.2, 0.72);
    const benchLegGeo = new THREE.BoxGeometry(0.12, 0.46, 0.12);
    const warmZoneMatGeo = new THREE.BoxGeometry(11.2, 0.38, 8.6);
    geometries.push(benchGeo, benchLegGeo, warmZoneMatGeo);
    const benchTop = new THREE.Mesh(benchGeo, benchMat);
    benchTop.position.set(0.08, -3.46, 0.3);
    const legA = new THREE.Mesh(benchLegGeo, weightMat);
    legA.position.set(-0.86, -3.68, 0.3);
    const legB = legA.clone();
    legB.position.x = 1.02;
    group.add(benchTop, legA, legB);

    const warmMatA = new THREE.Mesh(warmZoneMatGeo, warmZoneMatMat);
    warmMatA.position.set(2.0, -3.88, -0.12);
    warmMatA.receiveShadow = true;
    const warmMatB = warmMatA.clone();
    warmMatB.position.z = 8.45;
    group.add(warmMatA, warmMatB);

    const bandMat = new THREE.MeshStandardMaterial({
      color: themeHex,
      emissive: themeHex,
      emissiveIntensity: 0.2,
      roughness: 0.5,
      metalness: 0.1,
    });
    const bandMatAlt = new THREE.MeshStandardMaterial({ color: 0x00d4aa, emissive: 0x00d4aa, emissiveIntensity: 0.2, roughness: 0.52, metalness: 0.08 });
    const bandMatDark = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.7, metalness: 0.05 });
    materials.push(bandMat, bandMatAlt, bandMatDark);
    const bandGeo = new THREE.TorusGeometry(0.28, 0.03, 12, 28);
    geometries.push(bandGeo);
    const bandA = new THREE.Mesh(bandGeo, bandMat);
    bandA.position.set(2.5, -3.62, 2.25);
    bandA.rotation.set(Math.PI / 2, 0.2, 0.18);
    bandA.castShadow = true;
    bandA.receiveShadow = true;
    bandA.userData.warmupTarget = true;
    const bandB = new THREE.Mesh(bandGeo, bandMatAlt);
    bandB.position.set(3.05, -3.61, 2.05);
    bandB.rotation.set(Math.PI / 2, -0.1, -0.26);
    bandB.scale.set(1.12, 0.88, 1.08);
    bandB.castShadow = true;
    bandB.receiveShadow = true;
    bandB.userData.warmupTarget = true;
    const bandC = new THREE.Mesh(bandGeo, bandMatDark);
    bandC.position.set(2.74, -3.63, 1.72);
    bandC.rotation.set(Math.PI / 2, 0.34, -0.1);
    bandC.scale.set(0.94, 0.92, 0.92);
    bandC.castShadow = true;
    bandC.receiveShadow = true;
    bandC.userData.warmupTarget = true;
    group.add(bandA, bandB, bandC);

    leftPost.castShadow = true;
    leftPost.userData.warmupTarget = true;
    rightPost.castShadow = true;
    rightPost.userData.warmupTarget = true;
    shortPostL.castShadow = true;
    shortPostL.userData.warmupTarget = true;
    shortPostR.castShadow = true;
    shortPostR.userData.warmupTarget = true;
    group.add(leftPost, rightPost, shortPostL, shortPostR, bar, shortBar);
    group.userData.warmupTarget = true;
    group.position.set(15.5, -1, 4.3);
    targetScene.add(group);

    return { group, spot, bar, barFrameMat, barRailMat };
  };

  const warmUpZone = setupWarmUpZone(scene);

  const createGymMats = (targetScene: THREE.Scene) => {
    const floorGroup = new THREE.Group();
    const matMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.4,
      metalness: 0.2,
    });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.72, metalness: 0.02 });
    materials.push(matMaterial, coreMat);

    const matWidth = 6;
    const matDepth = 4;
    const matThickness = 0.6;
    const matGeo = new THREE.BoxGeometry(matWidth - 0.1, matThickness, matDepth - 0.1);
    const coreGeo = new THREE.BoxGeometry(matWidth - 0.08, matThickness * 0.2, matDepth - 0.08);
    geometries.push(matGeo, coreGeo);

    // Wider wall-floor coverage, but keep warm-up zone area separate.
    for (let x = -2; x <= 1; x++) {
      for (let z = -2; z <= 3; z++) {
        const mat = new THREE.Mesh(matGeo, matMaterial);
        mat.position.set(x * matWidth, -4.7, z * matDepth + 2);
        mat.receiveShadow = true;
        mat.castShadow = true;
        floorGroup.add(mat);

        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 0;
        mat.add(core);
      }
    }

    targetScene.add(floorGroup);
  };

  createGymMats(scene);

  const createWalkwayGround = (targetScene: THREE.Scene) => {
    const underlayMat = new THREE.MeshStandardMaterial({ color: 0x141519, roughness: 1, metalness: 0 });
    const underlayGeo = new THREE.BoxGeometry(80, 1.6, 80);
    materials.push(underlayMat);
    geometries.push(underlayGeo);

    // Prevent seeing dark "void" below floor.
    const underlay = new THREE.Mesh(underlayGeo, underlayMat);
    underlay.position.set(0, -5.9, 0);
    underlay.receiveShadow = false;
    underlay.castShadow = false;

    targetScene.add(underlay);
  };

  createWalkwayGround(scene);

  const createVolumes = (targetWallGroup: THREE.Group) => {
    const volumeMeshes: THREE.Mesh[] = [];
    const volumeChipGlowMaterials: Array<{ sectionIdx: number; mat: THREE.MeshStandardMaterial }> = [];
      const volumeMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.9,
      metalness: 0.1,
    });
    materials.push(volumeMat);
    VOLUME_CONFIGS.forEach((vc) => {
      const geo = new THREE.TetrahedronGeometry(vc.scale);
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, volumeMat);
      const pos = holdWorldPos(vc.p, vc.u, vc.v);
      mesh.position.copy(pos);
      mesh.rotation.set(...vc.rot);
      mesh.scale.z = 0.55;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      targetWallGroup.add(mesh);
      volumeMeshes.push(mesh);

      const sectionIdxForPanel = vc.p === 0 ? 0 : vc.p === 1 ? 2 : 4;
      const chipColor = SECTION_ROUTE_COLORS[sectionIdxForPanel]![0]!;
      const chipMat = new THREE.MeshStandardMaterial({
        color: chipColor,
        emissive: chipColor,
        emissiveIntensity: 0.06,
        roughness: 0.62,
        metalness: 0.08,
      });
      materials.push(chipMat);
      volumeChipGlowMaterials.push({ sectionIdx: sectionIdxForPanel, mat: chipMat });
      const chipOffsets: Array<[number, number, number]> = [[0.22, 0.16, 0.34], [-0.2, 0.22, 0.3], [0.08, -0.08, 0.36]];
      chipOffsets.forEach((off, idx) => {
        const chipGeo = new THREE.IcosahedronGeometry(Math.max(0.17, vc.scale * 0.16 + idx * 0.02), 0);
        geometries.push(chipGeo);
        const chip = new THREE.Mesh(chipGeo, chipMat);
        // Keep chips attached to volume so they remain visible and non-floating after projection.
        chip.position.set(off[0], off[1], off[2]);
        chip.rotation.set(off[0] * 3.2, off[1] * 2.4, off[2] * 4.1);
        chip.castShadow = false;
        chip.scale.z = 1 / 0.55;
        mesh.add(chip);
      });
    });
    return { volumeMeshes, volumeChipGlowMaterials };
  };

  const boltMat = new THREE.MeshStandardMaterial({ color: 0x999990, roughness: 0.2, metalness: 0.95 });
  materials.push(boltMat);

  const createGymStructure = (targetWallGroup: THREE.Group) => {
    const wallMat = makeWallMat(12, 10);
    wallMat.roughness = 0.8;
    wallMat.side = THREE.DoubleSide;
    wallMat.transparent = false;
    wallMat.opacity = 1;

    // Main folded facade.
    const foldedGeo = new THREE.BufferGeometry();
    const yMid = 0.4;
    const vertices = new Float32Array([
      -10, -5 + yMid, 0,
      10, -5 + yMid, 0,
      -10, 5 + yMid, 0,
      10, 5 + yMid, 0,
      0, 0 + yMid, 2.5,
      -5, 5 + yMid, 1.5,
      5, -5 + yMid, 1.2,
    ]);
    const indices = [
      0, 4, 2,
      4, 1, 3,
      2, 5, 4,
      5, 3, 4,
      0, 6, 4,
      6, 1, 4,
    ];
    const uvs = new Float32Array([
      0.0, 0.0, // 0
      1.0, 0.0, // 1
      0.0, 1.0, // 2
      1.0, 1.0, // 3
      0.5, 0.46, // 4 prow
      0.25, 1.0, // 5
      0.75, 0.0, // 6
    ]);
    foldedGeo.setIndex(indices);
    foldedGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    foldedGeo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    const foldedPos = foldedGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < foldedPos.count; i++) {
      const x = foldedPos.getX(i);
      const y = foldedPos.getY(i);
      const z = foldedPos.getZ(i);
      const jitter = (rng(x * 1.2 + y * 0.77 + i * 3.1) - 0.5) * 0.12;
      foldedPos.setZ(i, z + jitter);
    }
    foldedPos.needsUpdate = true;
    foldedGeo.computeVertexNormals();
    geometries.push(foldedGeo);
    const foldedWall = new THREE.Mesh(foldedGeo, wallMat);
    foldedWall.name = "mainWall";
    foldedWall.userData.sectionIdx = 2;
    foldedWall.castShadow = false;
    foldedWall.receiveShadow = true;
    targetWallGroup.add(foldedWall);

    // Enclosure back wall.
    const roomMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92, metalness: 0.05, side: THREE.DoubleSide });
    materials.push(roomMat);
    const backGeo = new THREE.PlaneGeometry(44, 24);
    geometries.push(backGeo);
    const backWall = new THREE.Mesh(backGeo, roomMat);
    backWall.position.set(5, 0.4, -1);
    backWall.userData.sectionIdx = 2;
    backWall.receiveShadow = false;
    backWall.castShadow = false;
    targetWallGroup.add(backWall);

    // Depth returns with the same wall texture family/design.
    const returnMat = makeWallMat(6, 10);
    returnMat.side = THREE.DoubleSide;
    returnMat.roughness = wallMat.roughness;
    const topReturnMat = makeWallMat(20, 2.2);
    topReturnMat.side = THREE.DoubleSide;
    topReturnMat.roughness = wallMat.roughness;
    const sideReturnGeo = new THREE.PlaneGeometry(2.2, 10, 6, 8);
    const topReturnGeo = new THREE.PlaneGeometry(20, 2.2, 16, 3);
    geometries.push(sideReturnGeo, topReturnGeo);
    const leftReturn = new THREE.Mesh(sideReturnGeo, returnMat);
    leftReturn.position.set(-10.05, 0.4, -1.1);
    leftReturn.rotation.y = Math.PI / 2;
    leftReturn.userData.sectionIdx = 1;
    leftReturn.receiveShadow = true;
    leftReturn.castShadow = false;
    const rightReturn = new THREE.Mesh(sideReturnGeo, returnMat);
    rightReturn.position.set(10.05, 0.4, -1.1);
    rightReturn.rotation.y = -Math.PI / 2;
    rightReturn.userData.sectionIdx = 3;
    rightReturn.receiveShadow = true;
    rightReturn.castShadow = false;
    const topReturn = new THREE.Mesh(topReturnGeo, topReturnMat);
    // Folded wall top edge is ~y = 5 + yMid (=5.4). Keep top flange flush/overlap ~2cm — was 6.05 and showed a daylight gap.
    const wallTopY = 5 + yMid;
    topReturn.position.set(0, wallTopY + 0.02, -1.05);
    topReturn.rotation.x = -Math.PI / 2;
    topReturn.userData.sectionIdx = 2;
    topReturn.receiveShadow = true;
    topReturn.castShadow = false;
    targetWallGroup.add(leftReturn, rightReturn, topReturn);

    return foldedWall;
  };

  const mainWallMesh = createGymStructure(wallGroup);
  const createGymWallHangboard = (targetWallGroup: THREE.Group) => {
    const hangboardGroup = new THREE.Group();
    hangboardGroup.userData.warmupTarget = true;

    const hangBackerMat = new THREE.MeshStandardMaterial({ color: 0x4d372b, roughness: 0.92, metalness: 0.03 });
    const hangBoardMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.58, metalness: 0.08 });
    const hangPocketMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.92, metalness: 0.04 });
    hangBoardMat.polygonOffset = true;
    hangBoardMat.polygonOffsetFactor = 1;
    hangBoardMat.polygonOffsetUnits = 1;
    hangPocketMat.polygonOffset = true;
    hangPocketMat.polygonOffsetFactor = -2;
    hangPocketMat.polygonOffsetUnits = -2;
    materials.push(hangBackerMat, hangBoardMat, hangPocketMat);

    const backerGeo = new THREE.BoxGeometry(2.5, 1.2, 0.1);
    geometries.push(backerGeo);

    const backer = new THREE.Mesh(backerGeo, hangBackerMat);
    backer.castShadow = true;
    backer.receiveShadow = true;
    backer.userData.warmupTarget = true;

    const width = 2.2;
    const height = 0.8;
    const radius = 0.15;
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + radius, -height / 2);
    shape.lineTo(width / 2 - radius, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
    shape.lineTo(width / 2, height / 2 - radius);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
    shape.lineTo(-width / 2 + radius, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
    shape.lineTo(-width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
    const boardGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 5,
    });
    geometries.push(boardGeo);

    const board = new THREE.Mesh(boardGeo, hangBoardMat);
    board.position.z = 0.03;
    board.castShadow = true;
    board.receiveShadow = true;
    board.userData.warmupTarget = true;

    const createPocket = (w: number, h: number, x: number, y: number) => {
      const pGeo = new THREE.BoxGeometry(w, h, 0.09);
      geometries.push(pGeo);
      const p = new THREE.Mesh(pGeo, hangPocketMat);
      p.position.set(x, y, 0.28);
      p.castShadow = true;
      p.receiveShadow = true;
      p.userData.warmupTarget = true;
      hangboardGroup.add(p);
    };
    createPocket(0.5, 0.25, -0.7, 0.2);
    createPocket(0.5, 0.25, 0.7, 0.2);
    createPocket(0.4, 0.15, -0.6, -0.2);
    createPocket(0.4, 0.15, 0, -0.2);
    createPocket(0.4, 0.15, 0.6, -0.2);

    hangboardGroup.add(backer, board);
    const hangLight = new THREE.SpotLight(0xfff4de, 2.6, 10, Math.PI / 5.2, 0.34, 1.0);
    hangLight.position.set(0.3, 1.5, 2.1);
    hangLight.castShadow = true;
    hangLight.shadow.mapSize.set(1024, 1024);
    hangLight.shadow.bias = -0.0003;
    hangLight.target = board;
    hangboardGroup.add(hangLight);
    // Mount on the same large back wall used by the gym wall enclosure.
    hangboardGroup.position.set(15.2, 3.45, -0.8);
    hangboardGroup.scale.set(1.24, 1.24, 1.24);
    targetWallGroup.add(hangboardGroup);
  };
  createGymWallHangboard(wallGroup);
  const { volumeMeshes: projectedVolumeMeshes, volumeChipGlowMaterials } = createVolumes(wallGroup);

  const createHoldMesh = (d: HoldDef, color: number) => {
    const holdColor = color;
    const holdMat = new THREE.MeshStandardMaterial({
      color: holdColor,
      emissive: holdColor,
      emissiveIntensity: 0,
      roughness: 0.7,
      metalness: 0.2,
    });
    materials.push(holdMat);

    let geo: THREE.BufferGeometry;
    const s = d.s * 0.1;
    switch (d.kind) {
      case "sloper":
        geo = new THREE.IcosahedronGeometry(s * 1.8, 1);
        break;
      case "crimp":
        geo = new THREE.BoxGeometry(s * 2.5, s * 0.5, s * 1.2);
        break;
      case "jug":
        geo = new THREE.TorusGeometry(s * 1.2, s * 0.4, 6, 12, Math.PI * 1.2);
        break;
      case "pinch":
        geo = new THREE.CapsuleGeometry(s * 0.5, s * 1.5, 2, 6);
        break;
      default:
        geo = new THREE.IcosahedronGeometry(s, 0);
    }
    geometries.push(geo);

    const mesh = new THREE.Mesh(geo, holdMat);
    mesh.scale.set(
      0.8 + rng(d.u * 10) * 0.5,
      0.8 + rng(d.v * 10) * 0.5,
      0.7 + rng(d.u + d.v) * 0.3
    );
    mesh.rotation.set(
      (rng(d.u) - 0.5) * 0.3,
      (rng(d.v) - 0.5) * 0.3,
      rng(d.u + d.v) * Math.PI * 2
    );
    return mesh;
  };
  const holdGroups: THREE.Group[] = [];
  const holdSections: number[] = [];
  HOLD_DEFS.forEach((d) => {
    const pal = SECTION_ROUTE_COLORS[d.sectionIdx]!;
    const color = pal[(d.paletteVariant ?? 0) % pal.length]!;
    const g = new THREE.Group();
    const body = createHoldMesh(d, color);
    if (d.kind === "jug") body.rotation.z = Math.PI / 2;
    if (d.kind === "sloper") body.rotation.x = Math.PI;
    if (d.kind === "pocket") body.rotation.x = Math.PI / 2;
    g.add(body);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.055, 6), boltMat);
    geometries.push(bolt.geometry);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.z = -0.015;
    g.add(bolt);
    const p = GYM_PANELS[d.pi]!;
    g.userData.sectionIdx = d.sectionIdx;
    g.rotation.y = p.ry;
    g.rotation.z = rng(d.u * 17 + d.v * 31) * Math.PI * 2;
    g.position.copy(holdWorldPos(d.pi, d.u, d.v));
    wallGroup.add(g);
    holdGroups.push(g);
    holdSections.push(d.sectionIdx);
  });

  const stickHoldsToFoldedWall = (groups: THREE.Group[], wallMesh: THREE.Mesh) => {
    const raycaster = new THREE.Raycaster();
    const frontToWall = new THREE.Vector3(0, 0, -1);
    const backToWall = new THREE.Vector3(0, 0, 1);

    groups.forEach((hold) => {
      const rayOriginFront = new THREE.Vector3(hold.position.x, hold.position.y, 12);
      raycaster.set(rayOriginFront, frontToWall);
      let hits = raycaster.intersectObject(wallMesh, false);
      if (hits.length < 1) {
        const rayOriginBack = new THREE.Vector3(hold.position.x, hold.position.y, -12);
        raycaster.set(rayOriginBack, backToWall);
        hits = raycaster.intersectObject(wallMesh, false);
      }
      if (hits.length < 1) return;
      const hit = hits[0]!;
      if (!hit.face) return;
      const worldNormal = hit.face.normal.clone().transformDirection(wallMesh.matrixWorld).normalize();
      hold.position.copy(hit.point).addScaledVector(worldNormal, 0.035);
      hold.lookAt(hit.point.clone().add(worldNormal));
    });
  };

  stickHoldsToFoldedWall(holdGroups, mainWallMesh);

  // Compact circular L / R / TOP markers per route (UK wall style). Footholds excluded from anchors.
  const routeTagRadius = 0.055;
  const tagNormalOut = 0.26;
  const besideHold = routeTagRadius * 6.2;
  const besideSameHold = besideHold + routeTagRadius * 2.4;
  const aboveTopHold = routeTagRadius * 5.2;
  for (let routeIdx = 0; routeIdx < SECTION_ROUTE_COLORS.length; routeIdx++) {
    const candIdx: number[] = [];
    HOLD_DEFS.forEach((d, i) => {
      if (d.sectionIdx !== routeIdx) return;
      if (!isFootHoldDef(d)) candIdx.push(i);
    });
    const pool =
      candIdx.length > 0
        ? candIdx
        : HOLD_DEFS.map((d, i) => (d.sectionIdx === routeIdx ? i : -1)).filter((i) => i >= 0);
    const sortedByV = [...pool].sort((ia, ib) => HOLD_DEFS[ia]!.v - HOLD_DEFS[ib]!.v);
    if (sortedByV.length === 0) continue;
    const iTop = sortedByV[sortedByV.length - 1]!;
    const lowBand = sortedByV.slice(0, Math.max(1, Math.min(4, sortedByV.length)));
    const rnd = (k: number) => rng(routeIdx * 8171 + k * 13007 + 4481);
    let holdLIdx: number;
    let holdRIdx: number;
    if (lowBand.length < 2 || rnd(1) < 0.44) {
      const pick = lowBand[Math.floor(rnd(2) * lowBand.length)]!;
      holdLIdx = pick;
      holdRIdx = pick;
    } else {
      const a = Math.floor(rnd(3) * lowBand.length);
      let b = Math.floor(rnd(4) * lowBand.length);
      if (b === a) b = (a + 1) % lowBand.length;
      holdLIdx = lowBand[a]!;
      holdRIdx = lowBand[b]!;
    }

    const accent = SECTION_ROUTE_COLORS[routeIdx]![0]!;

    const makeTagMesh = (line: string) => {
      const cv = drawCircularRouteTagCanvas(line, accent);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      textures.push(tex);
      const tagMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        side: THREE.DoubleSide,
      });
      materials.push(tagMat);
      const geo = new THREE.CircleGeometry(routeTagRadius, 40);
      geometries.push(geo);
      const tagMesh = new THREE.Mesh(geo, tagMat);
      tagMesh.renderOrder = 8;
      return tagMesh;
    };

    const tagL = makeTagMesh("L");
    const tagR = makeTagMesh("R");
    const tagTop = makeTagMesh("TOP");

    const placeCircularTag = (mesh: THREE.Mesh, holdIx: number, alongLocalX: number, alongLocalY: number) => {
      const hGrp = holdGroups[holdIx]!;
      mesh.position.copy(hGrp.position);
      mesh.quaternion.copy(hGrp.quaternion);
      mesh.translateOnAxis(new THREE.Vector3(1, 0, 0), alongLocalX);
      mesh.translateOnAxis(new THREE.Vector3(0, 1, 0), alongLocalY);
      mesh.translateOnAxis(new THREE.Vector3(0, 0, 1), tagNormalOut);
    };

    const sameHold = holdLIdx === holdRIdx;
    const yJitL = rnd(12) > 0.5 ? rnd(13) * 0.065 : -rnd(13) * 0.065;
    const yJitR = rnd(14) > 0.52 ? rnd(15) * 0.065 : -rnd(15) * 0.065;
    placeCircularTag(tagL, holdLIdx, sameHold ? -besideSameHold : -besideHold, yJitL - routeTagRadius * 0.2);
    placeCircularTag(tagR, holdRIdx, sameHold ? besideSameHold : besideHold, yJitR + routeTagRadius * 0.2);
    const topYB = rnd(16) > 0.62 ? rnd(17) * 0.04 : -rnd(17) * 0.065;
    placeCircularTag(tagTop, iTop, (rnd(5) - 0.49) * 0.07, aboveTopHold + topYB);
    wallGroup.add(tagL);
    wallGroup.add(tagR);
    wallGroup.add(tagTop);
  }

  const stickObjectsToFoldedWall = (objs: THREE.Object3D[], wallMesh: THREE.Mesh) => {
    const raycaster = new THREE.Raycaster();
    const frontToWall = new THREE.Vector3(0, 0, -1);
    const backToWall = new THREE.Vector3(0, 0, 1);
    objs.forEach((obj) => {
      const rayOriginFront = new THREE.Vector3(obj.position.x, obj.position.y, 12);
      raycaster.set(rayOriginFront, frontToWall);
      let hits = raycaster.intersectObject(wallMesh, false);
      if (hits.length < 1) {
        const rayOriginBack = new THREE.Vector3(obj.position.x, obj.position.y, -12);
        raycaster.set(rayOriginBack, backToWall);
        hits = raycaster.intersectObject(wallMesh, false);
      }
      if (hits.length < 1) return;
      const hit = hits[0]!;
      if (!hit.face) return;
      const worldNormal = hit.face.normal.clone().transformDirection(wallMesh.matrixWorld).normalize();
      obj.position.copy(hit.point).addScaledVector(worldNormal, 0.12);
    });
  };

  stickObjectsToFoldedWall(projectedVolumeMeshes, mainWallMesh);

  const rewardStart = new THREE.Vector3(18.2, 10, 6.4);
  const rewardEnd = new THREE.Vector3(19.2, CHALK_BAG_WARM_REST_Y, 8.4);
  const bucketGroup = new THREE.Group();
  bucketGroup.name = "chalk_bucket";
  const bagBodyMat = new THREE.MeshStandardMaterial({ color: 0x6f6659, roughness: 0.92, metalness: 0.02 });
  const bagRimMat = new THREE.MeshStandardMaterial({ color: 0x2d3035, roughness: 0.5, metalness: 0.1 });
  const drawCordMat = new THREE.MeshStandardMaterial({ color: 0xff5a33, roughness: 0.38, metalness: 0.12, emissive: 0xff5a33, emissiveIntensity: 0.08 });
  const powderMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 1.0, metalness: 0.0 });
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x25262a, roughness: 0.72, metalness: 0.05 });
  materials.push(bagBodyMat, bagRimMat, drawCordMat, powderMat, strapMat);
  const bagBodyGeo = new THREE.CylinderGeometry(0.46, 0.4, 0.76, 20);
  const bagBottomGeo = new THREE.SphereGeometry(0.37, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const rimGeo = new THREE.TorusGeometry(0.39, 0.04, 10, 20);
  const drawCordGeo = new THREE.TorusGeometry(0.42, 0.015, 8, 22);
  const powderGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.1, 16);
  const loopGeo = new THREE.TorusGeometry(0.08, 0.016, 8, 16, Math.PI * 0.9);
  const strapGeo = new THREE.BoxGeometry(0.62, 0.05, 0.18);
  geometries.push(bagBodyGeo, bagBottomGeo, rimGeo, drawCordGeo, powderGeo, loopGeo, strapGeo);
  const bagBody = new THREE.Mesh(bagBodyGeo, bagBodyMat);
  const bagBottom = new THREE.Mesh(bagBottomGeo, bagBodyMat);
  bagBottom.position.y = -0.41;
  const rim = new THREE.Mesh(rimGeo, bagRimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.28;
  const drawCord = new THREE.Mesh(drawCordGeo, drawCordMat);
  drawCord.rotation.x = Math.PI / 2;
  drawCord.position.y = 0.24;
  const powderMesh = new THREE.Mesh(powderGeo, powderMat);
  powderMesh.position.y = 0.26;
  const loopL = new THREE.Mesh(loopGeo, strapMat);
  loopL.position.set(-0.37, 0.02, 0);
  loopL.rotation.z = Math.PI / 2;
  const loopR = loopL.clone();
  loopR.position.x = 0.37;
  const strap = new THREE.Mesh(strapGeo, strapMat);
  strap.position.set(0, -0.07, -0.35);
  bucketGroup.add(bagBody, bagBottom, rim, drawCord, powderMesh, loopL, loopR, strap);
  bucketGroup.position.copy(rewardStart);
  bucketGroup.scale.set(0, 0, 0);
  bucketGroup.visible = false;
  bucketGroup.userData.rewardClaimable = false;
  scene.add(bucketGroup);

  const particleCount = 400;
  const puffGeo = new THREE.BufferGeometry();
  const puffPositions = new Float32Array(particleCount * 3);
  const puffVelocity = new Float32Array(particleCount * 3);
  puffGeo.setAttribute("position", new THREE.BufferAttribute(puffPositions, 3));
  const puffMat = new THREE.PointsMaterial({
    color: 0xcccccc,
    size: 0.05,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(puffMat);
  const chalkPuff = new THREE.Points(puffGeo, puffMat);
  chalkPuff.visible = false;
  scene.add(chalkPuff);

  let rewardDropActive = false;
  let rewardDropT = 0;
  let puffT = 0;
  let lastReward: RewardConfig | null = null;
  let climbSequenceActive = false;
  let climbSequenceDone = false;
  let climbT = 0;
  const climbBucketStart = new THREE.Vector3();
  const climbBucketTarget = new THREE.Vector3(5.4, CHALK_BAG_WALL_REST_Y, 5.8);
  const climbCamStart = new THREE.Vector3();
  const climbCamTarget = new THREE.Vector3(0, 1.2, 9);

  const triggerChalkExplosion = (intensity: number, color: number, origin = rewardEnd) => {
    puffT = 1.2;
    chalkPuff.visible = true;
    puffMat.opacity = 0.75;
    puffMat.color.setHex(color);
    puffMat.size = 0.035 + intensity * 0.02;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const ang = rng(i * 13.7 + intensity * 11) * Math.PI * 2;
      const elev = (rng(i * 7.3 + intensity * 3) - 0.15) * 0.9;
      const speed = (0.35 + rng(i * 17.1 + intensity) * 1.1) * intensity;
      puffPositions[i3] = origin.x + (rng(i * 1.7) - 0.5) * 0.18;
      puffPositions[i3 + 1] = origin.y + 0.38 + (rng(i * 2.2) - 0.5) * 0.16;
      puffPositions[i3 + 2] = origin.z + (rng(i * 3.1) - 0.5) * 0.18;
      puffVelocity[i3] = Math.cos(ang) * speed * 0.7;
      puffVelocity[i3 + 1] = 0.5 + elev + speed * 0.45;
      puffVelocity[i3 + 2] = Math.sin(ang) * speed * 0.45;
    }
    (chalkPuff.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  const triggerChalkReward = (type: ClimberType, spawnFromView = false) => {
    const cfg = getRewardConfig(type);
    lastReward = cfg;
    const darkBagColor = new THREE.Color(cfg.color).lerp(new THREE.Color(0x16171a), 0.52);
    bagBodyMat.color.copy(darkBagColor);
    bagBodyMat.emissive.copy(new THREE.Color(cfg.color));
    bagBodyMat.emissiveIntensity = 0.08;
    drawCordMat.color.setHex(cfg.color);
    drawCordMat.emissive.setHex(cfg.color);

    if (spawnFromView) {
      // Spawn in front-right of current camera view, then drop to mats.
      const fromCam = new THREE.Vector3(0.95, -0.15, -2.25).applyMatrix4(camera.matrixWorld);
      rewardStart.copy(fromCam);
      rewardEnd.set(19.2, CHALK_BAG_WARM_REST_Y, 8.4);
    } else {
      rewardStart.set(18.2, 10, 6.4);
      rewardEnd.set(17.1, CHALK_BAG_WARM_REST_Y, 6.5);
    }
    bucketGroup.visible = true;
    bucketGroup.position.copy(rewardStart);
    bucketGroup.scale.set(0.001, 0.001, 0.001);
    bucketGroup.userData.rewardClaimable = false;
    rewardDropActive = true;
    rewardDropT = 0;
  };

  const claimChalkReward = () => {
    if (!bucketGroup.userData.rewardClaimable) return false;
    bucketGroup.userData.rewardClaimable = false;
    const cfg = lastReward ?? { color: 0xffcc44, puffIntensity: 1 };
    triggerChalkExplosion(cfg.puffIntensity * 0.75, cfg.color, bucketGroup.position.clone());
    return true;
  };

  const syncChalkBagState = (status: "idle" | "reward_dropped" | "claimed" | "climbing", type: ClimberType | null) => {
    if (!type || status === "idle") {
      bucketGroup.visible = false;
      bucketGroup.userData.rewardClaimable = false;
      return;
    }

    const cfg = getRewardConfig(type);
    const darkBagColor = new THREE.Color(cfg.color).lerp(new THREE.Color(0x16171a), 0.52);
    bagBodyMat.color.copy(darkBagColor);
    bagBodyMat.emissive.copy(new THREE.Color(cfg.color));
    bagBodyMat.emissiveIntensity = 0.08;
    drawCordMat.color.setHex(cfg.color);
    drawCordMat.emissive.setHex(cfg.color);

    if (status === "claimed" || status === "climbing") {
      // Persisted state: bag rests on wall mats by default.
      bucketGroup.visible = true;
      bucketGroup.position.set(5.4, CHALK_BAG_WALL_REST_Y, 5.8);
      bucketGroup.scale.setScalar(1.04);
      bucketGroup.userData.rewardClaimable = false;
      rewardDropActive = false;
      climbSequenceActive = false;
      return;
    }

    if (status === "reward_dropped") {
      bucketGroup.visible = true;
      bucketGroup.position.copy(rewardEnd);
      bucketGroup.scale.setScalar(1.12);
      bucketGroup.userData.rewardClaimable = true;
    }
  };

  const startClimbingSequence = () => {
    if (!bucketGroup.visible) return false;
    rewardDropActive = false;
    climbSequenceActive = true;
    climbSequenceDone = false;
    climbT = 0;
    climbBucketStart.copy(bucketGroup.position);
    climbCamStart.copy(camera.position);
    return true;
  };

  const updateEffects = (dt: number) => {
    if (rewardDropActive) {
      rewardDropT = Math.min(1, rewardDropT + dt / 1.5);
      const eased = 1 - Math.pow(1 - rewardDropT, 3);
      const bounce = Math.sin(rewardDropT * Math.PI * 4.5) * Math.exp(-rewardDropT * 5) * 0.7;
      bucketGroup.position.lerpVectors(rewardStart, rewardEnd, eased);
      bucketGroup.position.y += bounce;
      const s = 0.92 + eased * 1.05;
      bucketGroup.scale.set(s, s, s);
      bucketGroup.rotation.y += dt * 1.6;
      if (rewardDropT >= 1) {
        rewardDropActive = false;
        bucketGroup.userData.rewardClaimable = true;
        const cfg = lastReward ?? { color: 0xffcc44, puffIntensity: 1 };
        triggerChalkExplosion(cfg.puffIntensity, cfg.color);
      }
    } else if (bucketGroup.visible) {
      bucketGroup.rotation.y += dt * 0.8;
      if (bucketGroup.userData.rewardClaimable) {
        const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.04;
        bucketGroup.scale.setScalar(pulse);
      }
    }

    if (puffT > 0 && chalkPuff.visible) {
      puffT = Math.max(0, puffT - dt);
      const drag = Math.max(0.86, 1 - dt * 0.8);
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        puffVelocity[i3] *= drag;
        puffVelocity[i3 + 1] = puffVelocity[i3 + 1] * drag - dt * 0.7;
        puffVelocity[i3 + 2] *= drag;
        puffPositions[i3] += puffVelocity[i3] * dt;
        puffPositions[i3 + 1] += puffVelocity[i3 + 1] * dt;
        puffPositions[i3 + 2] += puffVelocity[i3 + 2] * dt;
      }
      (chalkPuff.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      puffMat.opacity = Math.min(0.75, puffT * 0.75);
      if (puffT <= 0.02) {
        chalkPuff.visible = false;
        puffMat.opacity = 0;
      }
    }

    if (climbSequenceActive) {
      climbT += dt;
      // Pop phase (0 -> 0.4s), then flight phase (0.2 -> 2.0s)
      const popP = Math.min(1, climbT / 0.4);
      const popScale = popP < 1 ? 1 + Math.sin(popP * Math.PI) * 0.16 : 1;
      if (climbT <= 0.45) bucketGroup.scale.setScalar(popScale);

      if (climbT >= 0.2) {
        const flightP = Math.max(0, Math.min(1, (climbT - 0.2) / 1.8));
        const ease = flightP * flightP * (3 - 2 * flightP);
        bucketGroup.position.lerpVectors(climbBucketStart, climbBucketTarget, ease);
        camera.position.lerpVectors(climbCamStart, climbCamTarget, ease);
      }

      if (climbT >= 2.0 && !climbSequenceDone) {
        climbSequenceDone = true;
        triggerChalkExplosion((lastReward?.puffIntensity ?? 1) * 0.95, lastReward?.color ?? 0xffcc44, bucketGroup.position.clone());
      }
      if (climbT >= 2.15) {
        climbSequenceActive = false;
      }
    }
  };

  const dispose = () => {
    textures.forEach((t) => t.dispose());
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    renderer.dispose();
  };

  return {
    renderer,
    scene,
    camera,
    wallGroup,
    holdGroups,
    holdSections,
    volumeChipGlowMaterials,
    warmUpSpotlight: warmUpZone.spot,
    warmUpBar: warmUpZone.bar,
    warmUpFrameMat: warmUpZone.barFrameMat,
    warmUpBarMat: warmUpZone.barRailMat,
    triggerChalkReward,
    claimChalkReward,
    startClimbingSequence,
    syncChalkBagState,
    updateEffects,
    dispose,
  };
}

export default function Home() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SceneBundle | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrollRef = useRef(0);
  const targetScrollRef = useRef(0);
  const touchYRef = useRef<number | null>(null);
  const touchMode = useRef<"scroll" | "orbit" | "section-pan" | null>(null);
  const touchStartX = useRef(0);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartedOnInteractiveUiRef = useRef(false);

  const orbitRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
    zoom: 0,
    targetYaw: 0,
    targetPitch: 0,
    targetZoom: 0,
    pinchDist: null as number | null,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
  });
  const [loading, setLoading] = useState(true);
  const [doorOpening, setDoorOpening] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const activeSectionRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const [heroPointer, setHeroPointer] = useState({ x: 0.5, y: 0.5 });
  const [showHandCursor, setShowHandCursor] = useState(false);
  const [handCursorVisible, setHandCursorVisible] = useState(false);
  const [showWarmUpPrompt, setShowWarmUpPrompt] = useState(false);
  const [focusWarmUpZone, setFocusWarmUpZone] = useState(false);
  const [chalkStatus, setChalkStatus] = useState<"idle" | "reward_dropped" | "claimed" | "climbing">(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return "idle";
      const p = JSON.parse(raw) as { chalkStatus?: string };
      if (p.chalkStatus === "reward_dropped" || p.chalkStatus === "claimed" || p.chalkStatus === "climbing") return p.chalkStatus;
      return "idle";
    } catch {
      return "idle";
    }
  });
  const [climbState, setClimbState] = useState<"idle" | "flying" | "active" | "climbing">("idle");
  const [chalkOverlaySeen, setChalkOverlaySeen] = useState(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return false;
      const p = JSON.parse(raw) as { chalkOverlaySeen?: boolean };
      return Boolean(p.chalkOverlaySeen);
    } catch {
      return false;
    }
  });
  const lastRewardTypeRef = useRef<ClimberType | null>(null);
  const handCursorX = useMotionValue(0);
  const handCursorY = useMotionValue(0);
  const handCursorXSpring = useSpring(handCursorX, { stiffness: 420, damping: 36, mass: 0.45 });
  const handCursorYSpring = useSpring(handCursorY, { stiffness: 420, damping: 36, mass: 0.45 });
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return shuffleAndPickN(QUESTION_BANK.length, QUIZ_LENGTH);
      const parsed = JSON.parse(raw) as { selectedQuestionIndices?: number[] };
      const idx = parsed.selectedQuestionIndices;
      if (Array.isArray(idx) && idx.length === QUIZ_LENGTH && idx.every((n) => typeof n === "number" && n >= 0 && n < QUESTION_BANK.length)) return idx;
    } catch {}
    return shuffleAndPickN(QUESTION_BANK.length, QUIZ_LENGTH);
  });
  const axes = useMemo(
    () =>
      selectedQuestionIndices.map((idx, i) => {
        const q = QUESTION_BANK[idx];
        if (!q) return { key: `q${i}`, question: "", a: { value: "Technician" as ClimberType, label: "" }, b: { value: "Technician" as ClimberType, label: "" } };
        return { key: `q${i}`, question: q.question, a: { value: q.a, label: q.aL }, b: { value: q.b, label: q.bL } };
      }),
    [selectedQuestionIndices]
  );
  const [quizStep, setQuizStep] = useState(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return 0;
      const p = JSON.parse(raw) as { quizStep?: number };
      return typeof p.quizStep === "number" ? p.quizStep : 0;
    } catch {
      return 0;
    }
  });
  const [quiz, setQuiz] = useState<QuizState>(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return {};
      const p = JSON.parse(raw) as { quiz?: QuizState };
      return p.quiz && typeof p.quiz === "object" ? p.quiz : {};
    } catch {
      return {};
    }
  });
  const [resultType, setResultType] = useState<ClimberType | null>(() => {
    try {
      const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw) as { resultType?: string };
      const valid: ClimberType[] = ["Technician", "Explorer", "Strategist", "Flow Climber", "Motivator", "Grinder", "Risk-Taker", "Calm Connector"];
      return valid.includes(p.resultType as ClimberType) ? (p.resultType as ClimberType) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const seen = window.sessionStorage.getItem("cragmate_home_loader_seen") === "1";
    if (seen) { setLoading(false); setStarted(true); return; }
    const t = window.setTimeout(() => setDoorOpening(true), 260);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading || !doorOpening) return;
    const t = window.setTimeout(() => {
      window.sessionStorage.setItem("cragmate_home_loader_seen", "1");
      setLoading(false);
      setStarted(true);
    }, 2650);
    return () => window.clearTimeout(t);
  }, [doorOpening, loading]);

  useEffect(() => {
    if (!started) return;
    const t = window.setTimeout(() => setShowWarmUpPrompt(true), 650);
    return () => window.clearTimeout(t);
  }, [started]);

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 768);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const sync = () => setShowHandCursor(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!showHandCursor) {
      setHandCursorVisible(false);
      return;
    }
    const onMove = (e: MouseEvent) => {
      if (!handCursorVisible) setHandCursorVisible(true);
      handCursorX.set(e.clientX);
      handCursorY.set(e.clientY);
    };
    const onLeave = () => setHandCursorVisible(false);
    const onEnter = () => setHandCursorVisible(true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
    };
  }, [handCursorVisible, handCursorX, handCursorY, showHandCursor]);

  useEffect(() => {
    if (!started || !canvasRef.current) return;
    const bundle = buildScene(canvasRef.current);
    sceneRef.current = bundle;
    let t = 0;
    const animate = () => {
      rafRef.current = window.requestAnimationFrame(animate);
      t += 0.016;
      const orb = orbitRef.current;
      const MAX_YAW = 0.52;
      orb.targetYaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, orb.targetYaw));
      orb.yaw += (orb.targetYaw - orb.yaw) * 0.08;
      orb.yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, orb.yaw));
      orb.pitch += (orb.targetPitch - orb.pitch) * 0.08;
      orb.zoom += (orb.targetZoom - orb.zoom) * 0.08;
      orb.mouseX += (orb.targetMouseX - orb.mouseX) * 0.08;
      orb.mouseY += (orb.targetMouseY - orb.mouseY) * 0.08;
      scrollRef.current += (targetScrollRef.current - scrollRef.current) * 0.06;
      const sc = scrollRef.current;

      const { camera, wallGroup, holdGroups, holdSections, volumeChipGlowMaterials, warmUpSpotlight, warmUpBar, warmUpFrameMat, warmUpBarMat, renderer, scene } = bundle;
      bundle.updateEffects(0.016);
      const low = Math.max(0, Math.floor(sc));
      const high = Math.min(SECTIONS.length - 1, low + 1);
      const blend = sc - low;
      const sectionCenterX = (SECTION_X_ANCHORS[low] ?? 0) * (1 - blend) + (SECTION_X_ANCHORS[high] ?? 0) * blend;
      const targetFov = isMobile ? 62 : 52;
      if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov += (targetFov - camera.fov) * 0.12;
        camera.updateProjectionMatrix();
      }
      const baseCamY = isMobile ? 1.32 : 1.45;
      const baseCamZ = isMobile ? 18.9 : 13.5;
      const baseLookY = isMobile ? 0.28 : 0.3;
      const orbitRadius = baseCamZ + orb.zoom;
      const wallCamX = sectionCenterX + Math.sin(orb.yaw) * orbitRadius + orb.mouseX * 0.95;
      const wallCamY = baseCamY + orb.pitch * 2.8 + orb.mouseY * 0.35;
      const wallCamZ = Math.cos(orb.yaw) * orbitRadius + Math.abs(orb.mouseX) * 0.35;
      const warmCamX = isMobile ? 15.2 : 16.2;
      const warmCamY = isMobile ? 1.15 : 0.9;
      const warmCamZ = isMobile ? 31.8 : 24.4;
      const camLerp = focusWarmUpZone ? 0.11 : 0.08;
      const targetX = focusWarmUpZone ? warmCamX : wallCamX;
      const targetY = focusWarmUpZone ? warmCamY : wallCamY;
      const targetZ = focusWarmUpZone ? warmCamZ : wallCamZ;
      camera.position.x += (targetX - camera.position.x) * camLerp;
      camera.position.y += (targetY - camera.position.y) * camLerp;
      camera.position.z += (targetZ - camera.position.z) * camLerp;
      if (focusWarmUpZone) camera.lookAt(11.9 + orb.mouseX * 0.22, (isMobile ? -0.4 : -1.0) + orb.mouseY * 0.1, 4.1);
      else camera.lookAt(sectionCenterX + orb.mouseX * 0.28, baseLookY + orb.mouseY * 0.12, -0.25);

      // Keep wall fixed in place; only tiny ambient sway.
      wallGroup.rotation.y = Math.sin(t * 0.22) * 0.012;
      wallGroup.position.y = Math.sin(t * 0.38) * 0.018;

      const activeSec = Math.round(sc);
      if (activeSec !== activeSectionRef.current) {
        activeSectionRef.current = activeSec;
        setActiveSection(activeSec);
      }
      const glowForActiveHold = (isActive: boolean) => {
        if (!isActive) return 0.05;
        if (activeSec === 0) return 0.1;
        if (activeSec === 1) return 3.65;
        return 2.55;
      };
      holdGroups.forEach((hg, i) => {
        const base = hg.children[0];
        if (!(base instanceof THREE.Mesh) || !(base.material instanceof THREE.MeshStandardMaterial)) return;
        const routeIdx = holdSections[i]!;
        const isLit = routeGlowsForActiveSection(routeIdx, activeSec);
        const targetIntensity = glowForActiveHold(isLit);
        base.material.emissiveIntensity += (targetIntensity - base.material.emissiveIntensity) * 0.1;
      });
      volumeChipGlowMaterials.forEach(({ sectionIdx: routeChipIdx, mat }) => {
        const isLit = routeGlowsForActiveSection(routeChipIdx, activeSec);
        const targetIntensity = glowForActiveHold(isLit);
        mat.emissiveIntensity += (targetIntensity - mat.emissiveIntensity) * 0.1;
      });
      const warmTarget = focusWarmUpZone ? 46 : 16;
      warmUpSpotlight.intensity += (warmTarget - warmUpSpotlight.intensity) * 0.1;
      const warmPulse = focusWarmUpZone ? (1.0 + Math.sin(t * 4.8) * 0.48) : 0.22;
      warmUpBarMat.emissiveIntensity += (warmPulse - warmUpBarMat.emissiveIntensity) * 0.14;
      warmUpFrameMat.emissiveIntensity += ((focusWarmUpZone ? 0.68 : 0.3) - warmUpFrameMat.emissiveIntensity) * 0.1;
      warmUpBar.scale.y = 1 + (focusWarmUpZone ? Math.sin(t * 4.8) * 0.015 : 0);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!canvasRef.current || !sceneRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      sceneRef.current.camera.aspect = w / Math.max(h, 1);
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, Math.max(h, 1));
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      bundle.dispose();
      sceneRef.current = null;
    };
  }, [focusWarmUpZone, isMobile, started]);

  const moveTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(SECTIONS.length - 1, next));
    targetScrollRef.current = clamped;
    setActiveSection(Math.round(clamped));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (focusWarmUpZone) {
        if (e.key === "Escape" || e.key === "ArrowLeft" || e.key === "a" || e.key === "A" || e.key === "ArrowRight" || e.key === "d" || e.key === "D" || e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          setFocusWarmUpZone(false);
          if (e.key === "Escape") return;
        } else {
          return;
        }
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moveTo(targetScrollRef.current + 1);
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") moveTo(targetScrollRef.current - 1);
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") moveTo(targetScrollRef.current - 1);
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") moveTo(targetScrollRef.current + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusWarmUpZone, moveTo]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
                        e.preventDefault();
    if (focusWarmUpZone && !(e.ctrlKey || e.metaKey)) {
      setFocusWarmUpZone(false);
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      orbitRef.current.targetZoom = Math.max(-4, Math.min(4, orbitRef.current.targetZoom + e.deltaY * 0.01));
    }
  }, [focusWarmUpZone]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isInteractiveUiTarget(e.target)) return;
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    if (e.button === 2 || e.ctrlKey || e.altKey) e.preventDefault();
    // Allow normal left-drag to control camera pitch/yaw.
    orbitRef.current.isDragging = true;
    orbitRef.current.lastX = e.clientX;
    orbitRef.current.lastY = e.clientY;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(rect.width, 1);
    const ny = (e.clientY - rect.top) / Math.max(rect.height, 1);
    setHeroPointer({ x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) });
    orbitRef.current.targetMouseX = (nx - 0.5) * 2;
    orbitRef.current.targetMouseY = (0.5 - ny) * 0.75;
    if (!focusWarmUpZone && !orbitRef.current.isDragging && !isInteractiveUiTarget(e.target)) {
      targetScrollRef.current = nx * (SECTIONS.length - 1);
      // Gentle vertical pitch without sudden ceiling/floor jumps.
      const centeredY = 0.5 - ny;
      const deadZoneY = Math.abs(centeredY) < 0.05 ? 0 : centeredY;
      orbitRef.current.targetPitch = Math.max(-0.45, Math.min(0.45, deadZoneY * 0.9));
      return;
    }
    if (!orbitRef.current.isDragging) return;
    const dx = e.clientX - orbitRef.current.lastX;
    const dy = e.clientY - orbitRef.current.lastY;
    orbitRef.current.lastX = e.clientX;
    orbitRef.current.lastY = e.clientY;
    orbitRef.current.targetYaw += dx * 0.008;
    orbitRef.current.targetPitch = Math.max(-1.15, Math.min(1.15, orbitRef.current.targetPitch - dy * 0.006));
  }, [focusWarmUpZone]);

  const onMouseUp = useCallback(() => { orbitRef.current.isDragging = false; }, []);
  const onDoubleClick = useCallback(() => { orbitRef.current.targetYaw = 0; orbitRef.current.targetPitch = 0; orbitRef.current.targetZoom = 0; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      orbitRef.current.pinchDist = Math.hypot(dx, dy);
      touchMode.current = "orbit";
      touchStartedOnInteractiveUiRef.current = false;
      return;
    }
    if (isInteractiveUiTarget(e.target)) {
      touchStartedOnInteractiveUiRef.current = true;
      touchYRef.current = null;
      return;
    }
    touchStartedOnInteractiveUiRef.current = false;
    touchYRef.current = e.touches[0]!.clientY;
    touchStartX.current = e.touches[0]!.clientX;
    touchMode.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
                        e.preventDefault();
    if (touchStartedOnInteractiveUiRef.current && e.touches.length < 2) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      const dist = Math.hypot(dx, dy);
      if (orbitRef.current.pinchDist != null) {
        const delta = orbitRef.current.pinchDist - dist;
        orbitRef.current.targetZoom = Math.max(-4, Math.min(4, orbitRef.current.targetZoom + delta * 0.012));
      }
      orbitRef.current.pinchDist = dist;
                        return;
                      }
    const nowY = e.touches[0]!.clientY;
    const nowX = e.touches[0]!.clientX;
    if (touchYRef.current == null) return;
    const deltaY = touchYRef.current - nowY;
    const deltaX = nowX - touchStartX.current;
    if (isMobile) {
      if (focusWarmUpZone) setFocusWarmUpZone(false);
      // Mobile: use vertical swipe/scroll progression through sections.
      moveTo(targetScrollRef.current + deltaY * 0.01);
      touchYRef.current = nowY;
      touchStartX.current = nowX;
      return;
    }
    if (touchMode.current == null) touchMode.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.2 ? "section-pan" : "scroll";
    if (touchMode.current === "section-pan") {
      if (focusWarmUpZone) setFocusWarmUpZone(false);
      moveTo(targetScrollRef.current + deltaX * 0.009);
    } else if (touchMode.current === "orbit") {
      orbitRef.current.targetYaw += deltaX * 0.002;
                    } else {
      if (focusWarmUpZone) setFocusWarmUpZone(false);
      moveTo(targetScrollRef.current + deltaY * 0.008);
    }
    touchYRef.current = nowY;
    touchStartX.current = nowX;
  }, [focusWarmUpZone, isMobile, moveTo]);

  const onTouchEnd = useCallback(() => {
    orbitRef.current.pinchDist = null;
    touchMode.current = null;
    touchStartedOnInteractiveUiRef.current = false;
    touchYRef.current = null;
  }, []);
  const onClickScene = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractiveUiTarget(e.target)) return;
    if (!sceneRef.current || !canvasRef.current) return;
    const down = pointerDownRef.current;
    if (down) {
      const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (dist > 6) return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const y = -(((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(x, y);
    raycaster.setFromCamera(pointer, sceneRef.current.camera);
    const hits = raycaster.intersectObjects(sceneRef.current.scene.children, true);
    if (!hits.length) return;

    for (const h of hits) {
      let node: THREE.Object3D | null = h.object;
      while (node) {
        if (node.name === "chalk_bucket") {
          const claimed = sceneRef.current.claimChalkReward();
          if (claimed) {
            const startedSequence = sceneRef.current.startClimbingSequence();
            setChalkStatus("claimed");
            setClimbState("flying");
            setFocusWarmUpZone(false);
            setShowWarmUpPrompt(false);
            moveTo(0);
            if (startedSequence) window.setTimeout(() => setClimbState("active"), 2100);
            else setClimbState("active");
          }
          return;
        }
        if (node.userData?.warmupTarget || node.name === "pullup_bar") {
          setFocusWarmUpZone(true);
          setShowWarmUpPrompt(false);
          return;
        }
        const sectionIdx = node.userData?.sectionIdx;
        if (typeof sectionIdx === "number") {
          setFocusWarmUpZone(false);
          moveTo(sectionIdx);
          return;
        }
        node = node.parent;
      }
    }
  }, [moveTo]);

  useEffect(() => {
    if (!resultType) return;
    if (!focusWarmUpZone) return;
    if (!sceneRef.current) return;
    if (chalkStatus === "claimed" || chalkStatus === "climbing") return;
    if (lastRewardTypeRef.current === resultType) return;
    sceneRef.current.triggerChalkReward(resultType, true);
    lastRewardTypeRef.current = resultType;
    setChalkStatus("reward_dropped");
  }, [chalkStatus, focusWarmUpZone, resultType]);

  const current = SECTIONS[activeSection] ?? SECTIONS[0]!;
  const parallaxOffset = useMemo(() => ({ x: `${(activeSection - 2) * 1.2}%`, y: `${(2 - activeSection) * 1.0}%` }), [activeSection]);
  const currentAxis = axes[quizStep] ?? null;
  const resultBlurb = useMemo(() => getResultBlurb(resultType), [resultType]);
  const persistQuiz = useCallback((next: { quizStep: number; quiz: QuizState; resultType: ClimberType | null; selectedQuestionIndices: number[]; chalkStatus: "idle" | "reward_dropped" | "claimed" | "climbing"; chalkOverlaySeen: boolean }) => {
    window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next));
  }, []);
  const chooseQuiz = useCallback(
    (value: ClimberType) => {
      if (!currentAxis) return;
      const nextQuiz = { ...quiz, [currentAxis.key]: value };
      const computed = computeType(axes, nextQuiz);
      if (computed) {
        setQuiz(nextQuiz);
        setResultType(computed);
        setQuizStep(axes.length);
        setChalkStatus("reward_dropped");
        setChalkOverlaySeen(false);
        persistQuiz({ quizStep: axes.length, quiz: nextQuiz, resultType: computed, selectedQuestionIndices, chalkStatus: "reward_dropped", chalkOverlaySeen: false });
        return;
      }
      const nextStep = quizStep + 1;
      setQuiz(nextQuiz);
      setQuizStep(nextStep);
      persistQuiz({ quizStep: nextStep, quiz: nextQuiz, resultType: null, selectedQuestionIndices, chalkStatus, chalkOverlaySeen });
    },
    [axes, chalkOverlaySeen, chalkStatus, currentAxis, persistQuiz, quiz, quizStep, selectedQuestionIndices]
  );
  const resetQuiz = useCallback(() => {
    const nextIndices = shuffleAndPickN(QUESTION_BANK.length, QUIZ_LENGTH);
    setSelectedQuestionIndices(nextIndices);
    setQuizStep(0);
    setQuiz({});
    setResultType(null);
    setChalkStatus("idle");
    setClimbState("idle");
    setChalkOverlaySeen(false);
    lastRewardTypeRef.current = null;
    window.localStorage.removeItem(QUIZ_STORAGE_KEY);
  }, []);

  const goClimbNow = useCallback(() => {
    setClimbState("climbing");
    setChalkOverlaySeen(true);
    setLocation("/sessions");
  }, [setLocation]);

  useEffect(() => {
    if (!resultType) return;
    persistQuiz({ quizStep, quiz, resultType, selectedQuestionIndices, chalkStatus, chalkOverlaySeen });
  }, [chalkOverlaySeen, chalkStatus, persistQuiz, quizStep, quiz, resultType, selectedQuestionIndices]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.syncChalkBagState(chalkStatus, resultType);
  }, [chalkStatus, resultType, started]);

  return (
    <div
      style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden", background: "hsl(var(--background))", cursor: showHandCursor ? "none" : "auto" }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
            onMouseLeave={() => {
        onMouseUp();
        orbitRef.current.targetMouseX = 0;
        orbitRef.current.targetMouseY = 0;
      }}
      onDoubleClick={onDoubleClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onClickScene}
      onContextMenu={(e) => e.preventDefault()}
    >
      {loading ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "hsl(var(--background))", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: doorOpening
                ? "radial-gradient(circle at 50% 50%, rgba(0,212,170,0.22) 0%, rgba(0,212,170,0.08) 26%, rgba(0,0,0,0) 54%)"
                : "radial-gradient(circle at 50% 50%, rgba(0,212,170,0.1) 0%, rgba(0,0,0,0) 44%)",
              transition: "background 1.2s ease",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#00d4aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 12px", fontFamily: "inherit" }}>Cragmate Gym</p>
              <motion.h1
                className="font-display uppercase"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              style={{
                  margin: "0 0 12px",
                  fontSize: isMobile ? "clamp(2rem, 10vw, 2.8rem)" : "clamp(2.8rem, 6vw, 4.6rem)",
                  lineHeight: 0.92,
                  color: "#fff",
                  letterSpacing: "-0.015em",
                  textShadow: "0 8px 30px rgba(0,0,0,0.5)",
                }}
              >
                <span style={{ position: "relative", display: "inline-block" }}>
                  <motion.span
                    aria-hidden
              style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -52%)",
                      width: "125%",
                      height: "155%",
                background:
                        "radial-gradient(ellipse 55% 50% at 50% 42%, rgba(0,212,170,0.55) 0%, rgba(0,212,170,0.12) 52%, transparent 74%)",
                filter: "blur(22px)",
                      pointerEvents: "none",
                      zIndex: 0,
                      borderRadius: "50%",
                    }}
                    initial={{ opacity: 0.45, scale: 1 }}
                    animate={{ opacity: [0.38, 0.72, 0.46, 0.64, 0.42], scale: [0.96, 1.06, 0.98, 1.04, 0.97] }}
                    transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {[
                    { left: "-8%", top: "12%", width: "55%", rotate: "-32deg", del: 0 },
                    { left: "38%", top: "-5%", width: "48%", rotate: "-24deg", del: 0.35 },
                    { left: "12%", top: "48%", width: "72%", rotate: "-38deg", del: 0.7 },
                  ].map((b, i) => (
                    <motion.span
                      key={`bolt-${i}`}
                      aria-hidden
              style={{
                        position: "absolute",
                        left: b.left,
                        top: b.top,
                        width: b.width,
                        height: "10%",
                        minHeight: 3,
                        maxHeight: 10,
                        transform: `rotate(${b.rotate})`,
                        transformOrigin: "20% 50%",
                        pointerEvents: "none",
                        zIndex: 1,
                        borderRadius: 999,
                background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 20%, rgba(180,255,245,0.95) 50%, rgba(0,212,170,0.85) 62%, transparent 82%)",
                        mixBlendMode: "screen",
                        filter: "blur(0.4px)",
                        boxShadow: "0 0 12px rgba(0,212,170,0.55), 0 0 24px rgba(0,212,170,0.25)",
                      }}
                      initial={{ opacity: 0 }}
                animate={{
                        opacity: [0, 0, 0.95, 0.12, 0, 0, 0.8, 0, 0, 0.5, 0, 0],
                }}
                transition={{
                        duration: 5.8,
                  repeat: Infinity,
                        ease: "linear",
                        delay: b.del,
                }}
              />
            ))}
                  <motion.span
                    className="font-display uppercase"
              animate={{
                      opacity: [0.78, 1, 0.82, 0.96, 0.74, 0.99, 0.84],
                      color: ["#00d4aa", "#effefa", "#00e9c8", "#00d4aa", "#c6fff0", "#00d4aa", "#d5fff4"],
                    }}
                    transition={{ duration: 2.35, repeat: Infinity, ease: "easeInOut" }}
              style={{
                      position: "relative",
                      zIndex: 2,
                      display: "inline-block",
                      color: "#00d4aa",
                      textShadow:
                        "0 0 8px rgba(0,212,170,0.5), 0 0 24px rgba(0,212,170,0.35), 0 0 48px rgba(0,212,170,0.2), 0 0 1px rgba(255,255,255,0.18)",
                    }}
                  >
                    Conquer The Crag
                </motion.span>
                      </span>
            </motion.h1>
              <p style={{ color: "rgba(255,255,255,0.52)", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0, fontFamily: "inherit" }}>
                {doorOpening ? "Doors opening..." : "Approaching entrance..."}
              </p>
          </div>
        </div>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "52%",
              height: "100%",
              background: "linear-gradient(110deg, rgba(8,8,10,0.99), rgba(16,16,19,0.96) 42%, rgba(26,26,30,0.92))",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              transform: doorOpening ? "perspective(1400px) rotateY(-76deg) translateX(-12%)" : "perspective(1400px) rotateY(0deg) translateX(0%)",
              transformOrigin: "left center",
              transition: "transform 2.2s cubic-bezier(0.22, 1, 0.36, 1), filter 1.8s ease",
              filter: doorOpening ? "brightness(0.92)" : "brightness(1)",
              zIndex: 3,
            }}
          >
            <div style={{ position: "absolute", inset: "6% 4%", border: "1px solid rgba(255,255,255,0.05)" }} />
            <div style={{ position: "absolute", right: "9%", top: "50%", width: 10, height: 72, borderRadius: 999, transform: "translateY(-50%)", background: "linear-gradient(180deg, rgba(0,212,170,0.82), rgba(0,212,170,0.24))", boxShadow: "0 0 14px rgba(0,212,170,0.35)" }} />
          </div>
          <div
                style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "52%",
                      height: "100%",
              background: "linear-gradient(250deg, rgba(8,8,10,0.99), rgba(16,16,19,0.96) 42%, rgba(26,26,30,0.92))",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              transform: doorOpening ? "perspective(1400px) rotateY(76deg) translateX(12%)" : "perspective(1400px) rotateY(0deg) translateX(0%)",
              transformOrigin: "right center",
              transition: "transform 2.2s cubic-bezier(0.22, 1, 0.36, 1), filter 1.8s ease",
              filter: doorOpening ? "brightness(0.92)" : "brightness(1)",
              zIndex: 3,
            }}
          >
            <div style={{ position: "absolute", inset: "6% 4%", border: "1px solid rgba(255,255,255,0.05)" }} />
            <div style={{ position: "absolute", left: "9%", top: "50%", width: 10, height: 72, borderRadius: 999, transform: "translateY(-50%)", background: "linear-gradient(180deg, rgba(0,212,170,0.82), rgba(0,212,170,0.24))", boxShadow: "0 0 14px rgba(0,212,170,0.35)" }} />
          </div>
        </div>
      ) : null}

      <canvas
        ref={canvasRef}
                    style={{
          position: "absolute",
          inset: 0,
                      width: "100%",
                      height: "100%",
          display: started ? "block" : "none",
          pointerEvents: "none",
        }}
      />

      {started ? (
        <>
          <div style={{ position: "absolute", top: 18, left: isMobile ? 14 : 20, zIndex: 25, display: "flex", alignItems: "center", gap: 12, pointerEvents: "none" }}>
            <Mountain className="text-primary" style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, filter: "drop-shadow(0 0 10px rgba(0,212,170,0.45))" }} />
            <p className="font-display uppercase" style={{ margin: 0, color: "hsl(var(--primary))", fontSize: isMobile ? 28 : 44, letterSpacing: isMobile ? "0.12em" : "0.14em", lineHeight: 0.9, textShadow: "0 0 16px rgba(0,212,170,0.35)" }}>
              Cragmate
            </p>
          </div>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to right, rgba(9,8,7,0.64) 0%, rgba(9,8,7,0.28) 40%, rgba(9,8,7,0.03) 68%)" }} />
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.14) 0%, transparent 48%), radial-gradient(circle at 25% 65%, rgba(0,212,170,0.1) 0%, transparent 44%)", transform: `translate(${parallaxOffset.x}, ${parallaxOffset.y})` }} />
          <div
                                style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(circle at ${Math.round(heroPointer.x * 100)}% ${Math.round(heroPointer.y * 100)}%, rgba(0,212,170,0.14) 0%, rgba(0,212,170,0.06) 12%, transparent 38%)`,
              transition: "background 120ms linear",
              mixBlendMode: "screen",
            }}
          />
          {showHandCursor && handCursorVisible ? (
                  <motion.div
              className="fixed pointer-events-none z-[60]"
                                style={{
                left: 0,
                top: 0,
                x: handCursorXSpring,
                y: handCursorYSpring,
                transform: "translate(-45%, -20%)",
              }}
                                animate={{
                opacity: handCursorVisible ? 1 : 0,
                scale: handCursorVisible ? 1 : 0.92,
              }}
              transition={{ duration: 0.08, ease: "linear" }}
            >
              <Hand
                className="w-6 h-6 text-primary/95"
              />
            </motion.div>
          ) : null}

          {!focusWarmUpZone ? (
            <div style={{ position: "absolute", left: isMobile ? "5%" : "6%", top: isMobile ? "58%" : "50%", transform: "translateY(-50%)", zIndex: 10, maxWidth: isMobile ? "88vw" : 500 }}>
              <p className="font-display uppercase" style={{ color: current.accent, fontSize: isMobile ? 11 : 13, margin: "0 0 16px", fontWeight: 500, letterSpacing: "0.18em" }}>{current.tag}</p>
              <h1
                className="font-display"
            style={{
                  color: "#fff",
                  fontSize: isMobile ? "clamp(1.85rem, 7.5vw, 2.6rem)" : "clamp(2.4rem, 5.2vw, 4rem)",
                  fontWeight: 700,
                  lineHeight: 1.05,
                  margin: "0 0 18px",
                  letterSpacing: "0.045em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: isMobile ? "92vw" : "min(92vw, 520px)",
                  textShadow: "0 2px 40px rgba(0,0,0,0.85)",
                }}
              >
                {current.title}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.58)", fontSize: isMobile ? 13 : 15, lineHeight: 1.55, margin: "0 0 24px", maxWidth: isMobile ? "80vw" : 360 }}>{current.sub}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href={current.href}><Button className="uppercase tracking-[0.14em] text-xs sm:text-sm px-6">{current.cta}</Button></Link>
                <Link href="/beginner"><Button variant="outline" className="uppercase tracking-[0.14em] text-xs sm:text-sm px-5">Beginner guide</Button></Link>
              </div>
                </div>
          ) : null}

          {focusWarmUpZone ? (
            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{ position: "absolute", right: isMobile ? "4%" : "4%", top: isMobile ? "8%" : "10%", zIndex: 12, width: isMobile ? "92vw" : "min(420px, 38vw)", minWidth: isMobile ? 0 : 300, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.14)", padding: "14px 16px" }}>
              <p className="font-display uppercase" style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.9)", fontSize: 11, letterSpacing: "0.14em" }}>Warm-up zone quiz</p>
              {!resultType && currentAxis ? (
                <>
                  <p className="uppercase" style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.12em" }}>
                    Question {quizStep + 1} / {axes.length}
                  </p>
                  <p style={{ margin: "0 0 10px", color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 1.5 }}>{currentAxis.question}</p>
                  <div style={{ display: "grid", gap: 8 }}>
                    <Button variant="outline" className="justify-start text-left whitespace-normal h-auto py-2" onClick={() => chooseQuiz(currentAxis.a.value)}>
                    {currentAxis.a.label}
                  </Button>
                    <Button className="justify-start text-left whitespace-normal h-auto py-2" onClick={() => chooseQuiz(currentAxis.b.value)}>
                    {currentAxis.b.label}
                  </Button>
              </div>
            </>
          ) : (
                <>
                  <p className="font-display" style={{ margin: "0 0 6px", color: current.accent, fontSize: 32, fontWeight: 700, lineHeight: 1.05 }}>The {resultType}</p>
                  {resultBlurb ? <p style={{ margin: "0 0 10px", color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 1.5 }}>{resultBlurb}</p> : null}
                  {chalkStatus === "reward_dropped" ? (
                    <p className="uppercase" style={{ margin: "0 0 10px", color: "rgba(255,255,255,0.74)", fontSize: 11, letterSpacing: "0.12em" }}>
                      Click to claim your chalk bag on the right.
                    </p>
              ) : null}
                </>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                 <Button
                  size="sm"
                    variant="outline"
                  className="uppercase tracking-[0.14em] text-[10px]"
                  onClick={() => {
                    setFocusWarmUpZone(false);
                    setShowWarmUpPrompt(false);
                    }}
                  >
                  Back to wall
                </Button>
                <Button size="sm" variant="ghost" className="uppercase tracking-[0.14em] text-[10px]" onClick={resetQuiz}>Retake</Button>
              </div>
            </div>
          ) : null}

          {climbState === "active" && resultType && !chalkOverlaySeen ? (
            <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)" }}>
              <div style={{ position: "relative", borderTop: "2px solid", borderBottom: "2px solid", background: "rgba(0,0,0,0.82)", padding: isMobile ? "22px 20px" : "28px 44px", textAlign: "center", backdropFilter: "blur(6px)", maxWidth: isMobile ? "90vw" : "min(760px, 86vw)" }}>
      <button
        type="button"
                  aria-label="Close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChalkOverlaySeen(true);
                  }}
                  style={{
                    position: "absolute",
                    top: isMobile ? 8 : 10,
                    right: isMobile ? 8 : 12,
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.88)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} strokeWidth={2} />
      </button>
                <h2 className="font-display" style={{ margin: "0 0 8px", paddingRight: isMobile ? 36 : 40, fontSize: isMobile ? "clamp(2.1rem,11vw,3rem)" : "clamp(3.2rem,7vw,4.6rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", lineHeight: 0.94 }}>
                  CHALKED UP.
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                  <Button onClick={goClimbNow} className="h-12 px-8 uppercase tracking-[0.14em] text-sm font-semibold">
                    Go Climb Now
            </Button>
        </div>
            </div>
            </div>
          ) : null}

          {showWarmUpPrompt && !focusWarmUpZone ? (
            <motion.div
              role="button"
              tabIndex={0}
              aria-label="Go to warm-up zone"
              onClick={(e) => {
                e.stopPropagation();
                setFocusWarmUpZone(true);
                setShowWarmUpPrompt(false);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
                  setFocusWarmUpZone(true);
                  setShowWarmUpPrompt(false);
                }
              }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.86, 1, 0.86],
                boxShadow: [
                  "0 0 0 2px rgba(0,212,170,0.35), 0 0 18px rgba(0,212,170,0.25)",
                  "0 0 0 2px rgba(0,212,170,0.75), 0 0 32px rgba(0,212,170,0.45)",
                  "0 0 0 2px rgba(0,212,170,0.35), 0 0 18px rgba(0,212,170,0.25)",
                ],
              }}
              transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                top: "50%",
                right: isMobile ? 10 : "max(12px, 2.8vw)",
                transform: "translateY(-50%)",
                zIndex: 30,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 14px 12px",
                borderRadius: 12,
                background: "linear-gradient(180deg, rgba(18,22,21,0.96), rgba(8,10,11,0.98))",
                border: "1px solid rgba(0,212,170,0.45)",
              }}
            >
              <ArrowRight size={isMobile ? 28 : 32} strokeWidth={2.4} style={{ color: "hsl(var(--primary))" }} />
              <motion.span
                animate={{
                  opacity: [0.68, 1, 0.72],
                  textShadow: [
                    "0 0 8px rgba(0,212,170,0.35), 0 0 22px rgba(0,212,170,0.12)",
                    "0 0 18px rgba(0,212,170,0.85), 0 0 36px rgba(0,212,170,0.35)",
                    "0 0 10px rgba(0,212,170,0.45), 0 0 24px rgba(0,212,170,0.2)",
                  ],
                  color: ["rgba(0,212,170,0.82)", "rgba(212,255,245,1)", "rgba(0,212,170,0.88)"],
                }}
                transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Warm up
              </motion.span>
            </motion.div>
          ) : null}
          <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none" }}>
            <motion.p
              animate={{
                opacity: [0.68, 1, 0.72],
                textShadow: [
                  "0 0 8px rgba(0,212,170,0.35), 0 0 22px rgba(0,212,170,0.12)",
                  "0 0 18px rgba(0,212,170,0.85), 0 0 36px rgba(0,212,170,0.35)",
                  "0 0 10px rgba(0,212,170,0.45), 0 0 24px rgba(0,212,170,0.2)",
                ],
                color: ["rgba(0,212,170,0.82)", "rgba(212,255,245,1)", "rgba(0,212,170,0.88)"],
              }}
              transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
              style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}
            >
              {isMobile ? "Scroll down to explore" : "Drag to explore"}
            </motion.p>
            <div style={{ width: 1, height: 24, background: `linear-gradient(to bottom, ${current.accent}88, transparent)` }} />
          </div>
        </>
          ) : null}
      </div>
  );
}
