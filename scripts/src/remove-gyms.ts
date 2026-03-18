import { db, gymsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const GYM_NAMES_TO_REMOVE = ["b8a Climbing Gym", "boruda Climbing"];

async function main() {
  // Delete by exact `name` so we don't accidentally remove similarly-named gyms.
  const toDelete = await db
    .select()
    .from(gymsTable)
    .where(inArray(gymsTable.name, GYM_NAMES_TO_REMOVE));

  const deletedCount = await db
    .delete(gymsTable)
    .where(inArray(gymsTable.name, GYM_NAMES_TO_REMOVE));

  console.log("Gyms requested for removal:", GYM_NAMES_TO_REMOVE);
  console.log(
    "Gyms found before delete:",
    toDelete.map((g) => ({ id: (g as any).id, name: (g as any).name })),
  );
  console.log("Delete result:", deletedCount);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

