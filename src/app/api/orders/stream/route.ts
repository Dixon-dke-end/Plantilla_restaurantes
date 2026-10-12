import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { toErrorResponse } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

/** Staff-only Server-Sent Events: emits `change` whenever any order is created or updated. */
export async function GET(request: Request) {
  try {
    await requireRole(request, "employee");
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return Response.json(body, { status });
  }

  const { bus } = await getContainer();
  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const timers: { heartbeat?: ReturnType<typeof setInterval> } = {};
      let unsubscribe: () => void = () => {};

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      cleanup = () => {
        if (closed) return;
        closed = true;
        if (timers.heartbeat) clearInterval(timers.heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      send("retry: 3000\n\n");
      send(": connected\n\n");
      unsubscribe = bus.subscribe((event) => send(`event: change\ndata: ${JSON.stringify(event)}\n\n`));
      timers.heartbeat = setInterval(() => send(": heartbeat\n\n"), HEARTBEAT_MS);
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tell nginx-style proxies not to buffer the stream (Caddy uses flush_interval -1).
      "X-Accel-Buffering": "no",
    },
  });
}
