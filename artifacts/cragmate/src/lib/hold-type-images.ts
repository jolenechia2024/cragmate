import crimpImg from "@/assets/holds/crimp.jpg?url";
import gastonImg from "@/assets/holds/gaston.jpg?url";
import jugImg from "@/assets/holds/jug.jpg?url";
import pinchImg from "@/assets/holds/pinch.jpg?url";
import pocketImg from "@/assets/holds/pocket.jpg?url";
import sidepullImg from "@/assets/holds/sidepull.jpg?url";
import sloperImg from "@/assets/holds/sloper.jpg?url";
import underclingImg from "@/assets/holds/undercling.jpg?url";
import volumeImg from "@/assets/holds/volume.jpg?url";
import type { HoldTypeId } from "@/lib/hold-types";

export const HOLD_TYPE_IMAGES: Record<HoldTypeId, string> = {
  jug: jugImg,
  "crimp-edge": crimpImg,
  sloper: sloperImg,
  pinch: pinchImg,
  pocket: pocketImg,
  sidepull: sidepullImg,
  undercling: underclingImg,
  gaston: gastonImg,
  volume: volumeImg,
};
