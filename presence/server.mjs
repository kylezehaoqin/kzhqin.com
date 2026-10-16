// Entry point for the container. Settings come from the environment (apps/presence/compose.yml).
import { createPresenceServer } from "./app.mjs";

const env = process.env;
const { port } = await createPresenceServer({
  port: Number(env.PORT ?? 8090),
  total: Number(env.MAX_STREAMS ?? 200),
  perIp: Number(env.MAX_PER_IP ?? 4),
  lifeMs: Number(env.STREAM_LIFE_MS ?? 30 * 60_000),
  origins: ["https://kzhqin.com", ...(env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)],
  trustProxy: env.TRUST_PROXY === "1",
});
console.log(`presence listening on ${port}`);
