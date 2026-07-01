import fastifyCors from "@fastify/cors";
import Fastify from "fastify";

import { registerCapabilitiesRoutes } from "./routes/capabilities";
import { registerGitHubRoutes } from "./routes/github";
import { registerMorningBriefRoutes } from "./routes/morning-brief";

const baseCorsConfig = {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400,
};

const fastify = Fastify({
  logger: true,
});
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

fastify.register(fastifyCors, baseCorsConfig);
fastify.register(registerCapabilitiesRoutes);
fastify.register(registerGitHubRoutes);
fastify.register(registerMorningBriefRoutes);

fastify.get("/", async () => {
  return "OK";
});

fastify.listen({ port }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Server running on port ${port}`);
});
