import { getDbHandle } from "../src/server/db/client";

async function main() {
  const handle = await getDbHandle();
  await handle.migrate();
  console.log(`Migrations applied (${handle.driver}).`);
  await handle.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
