import crimpImg from "@/assets/holds/crimp.png?url";
import gastonImg from "@/assets/holds/gaston.png?url";
import jugImg from "@/assets/holds/jug.png?url";
import pinchImg from "@/assets/holds/pinch.png?url";
import pocketImg from "@/assets/holds/pocket.png?url";
import sidepullImg from "@/assets/holds/sidepull.png?url";
import sloperImg from "@/assets/holds/sloper.png?url";
import underclingImg from "@/assets/holds/undercling.png?url";
import volumeImg from "@/assets/holds/volume.png?url";
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
