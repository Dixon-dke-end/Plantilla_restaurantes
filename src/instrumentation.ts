export async function register() {
  // Run SQL migrations when the server boots (Node runtime only; never during `next build`).
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { getContainer } = await import("./server/container");
  await getContainer();
}
