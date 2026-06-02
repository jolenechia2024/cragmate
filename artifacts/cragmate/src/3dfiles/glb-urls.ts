/** Vite-resolved URLs for reference GLBs in this folder (Draco OK via {@link GLTFLoader}). */
import benchUrl from "./Bench.glb?url";
import fanUrl from "./Fan.glb?url";
import shoesUrl from "./Shoes.glb?url";
import waterBottleUrl from "./Water bottle.glb?url";

export const REFERENCE_GLB_URLS = {
  bench: benchUrl,
  fan: fanUrl,
  shoes: shoesUrl,
  waterBottle: waterBottleUrl,
} as const;
