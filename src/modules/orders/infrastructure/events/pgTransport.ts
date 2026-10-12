import { Client, type Pool } from "pg";
import type { PgNotifyTransport } from "./pgNotifyBus";

/**
 * Real LISTEN/NOTIFY transport. NOTIFY goes through the shared pool; LISTEN needs a dedicated,
 * long-lived connection which is re-established with backoff if it drops.
 */
export function createPgTransport(pool: Pool, connectionString: string): PgNotifyTransport {
  return {
    async notify(channel, payload) {
      await pool.query("select pg_notify($1, $2)", [channel, payload]);
    },

    async listen(channel, handler) {
      let client: Client | null = null;
      let stopped = false;
      let retry: ReturnType<typeof setTimeout> | null = null;
      let attempt = 0;

      const connect = async () => {
        if (stopped) return;
        const next = new Client({ connectionString });
        next.on("notification", (msg) => {
          if (msg.channel === channel && msg.payload !== undefined) handler(msg.payload);
        });
        const reconnect = () => {
          if (stopped || retry) return;
          next.removeAllListeners();
          next.end().catch(() => undefined);
          retry = setTimeout(
            () => {
              retry = null;
              void connect().catch(() => undefined);
            },
            Math.min(10_000, 500 * 2 ** attempt++),
          );
        };
        next.on("error", reconnect);
        next.on("end", reconnect);
        await next.connect();
        // Identifier-safe: the channel name is a constant of this app, never user input.
        await next.query(`LISTEN ${channel.replace(/[^a-z0-9_]/gi, "")}`);
        attempt = 0;
        client = next;
      };

      await connect();

      return async () => {
        stopped = true;
        if (retry) clearTimeout(retry);
        const current = client as Client | null;
        if (current) {
          current.removeAllListeners();
          await current.end().catch(() => undefined);
        }
      };
    },
  };
}
