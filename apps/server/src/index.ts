import fastifyCors from "@fastify/cors";
import Fastify from "fastify";

import { registerCapabilitiesRoutes } from "./routes/capabilities";
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

fastify.register(fastifyCors, baseCorsConfig);
fastify.register(registerCapabilitiesRoutes);
fastify.register(registerMorningBriefRoutes);

fastify.get("/", async () => {
  return "OK";
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log("Server running on port 3000");
});
