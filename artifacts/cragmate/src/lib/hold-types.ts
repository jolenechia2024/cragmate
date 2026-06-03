import { HOLD_TYPE_IMAGES } from "@/lib/hold-type-images";

export type HoldTypeId =
  | "jug"
  | "crimp-edge"
  | "sloper"
  | "pinch"
  | "pocket"
  | "sidepull"
  | "undercling"
  | "gaston"
  | "volume";

export type HoldType = {
  id: HoldTypeId;
  name: string;
  tip: string;
  image: string;
};

export const HOLD_TYPES: HoldType[] = [
  { id: "jug", name: "Jug", tip: "Big hold — rest here when you need a breath.", image: HOLD_TYPE_IMAGES.jug },
  { id: "crimp-edge", name: "Crimp", tip: "Thin edge — push with your feet so fingers last longer.", image: HOLD_TYPE_IMAGES["crimp-edge"] },
  { id: "sloper", name: "Sloper", tip: "Round hold — hips in, press down through your palms.", image: HOLD_TYPE_IMAGES.sloper },
  { id: "pinch", name: "Pinch", tip: "Squeeze thumb + fingers — stay tight in your core.", image: HOLD_TYPE_IMAGES.pinch },
  { id: "pocket", name: "Pocket", tip: "Hole for 1–3 fingers — load slowly, don't yank.", image: HOLD_TYPE_IMAGES.pocket },
  { id: "sidepull", name: "Sidepull", tip: "Pull sideways — lean the other way and use your feet.", image: HOLD_TYPE_IMAGES.sidepull },
  { id: "undercling", name: "Undercling", tip: "Hold from below — stand up through your legs.", image: HOLD_TYPE_IMAGES.undercling },
  { id: "gaston", name: "Gaston", tip: "Push outward — elbow out, body tension on.", image: HOLD_TYPE_IMAGES.gaston },
  { id: "volume", name: "Volume", tip: "Big shape on the wall — climb the whole surface.", image: HOLD_TYPE_IMAGES.volume },
];

export function getHoldType(id: HoldTypeId): HoldType {
  return HOLD_TYPES.find((h) => h.id === id) ?? HOLD_TYPES[0]!;
}
