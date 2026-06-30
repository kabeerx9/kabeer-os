import { env } from "@app-starter/env/server";
import { clerkPlugin } from "@clerk/fastify";
import fastifyCors from "@fastify/cors";
import Fastify from "fastify";

import { registerAccountRoutes } from "@/routes/account";
import { registerExampleProjectsRoutes } from "@/routes/example-projects";
import { registerMeRoutes } from "@/routes/me";
import { registerClerkWebhookRoutes } from "@/routes/webhooks/clerk";

const baseCorsConfig = {
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400,
};

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyCors, baseCorsConfig);
fastify.register(clerkPlugin, {
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
});

fastify.get("/", async () => {
  return "OK";
});

fastify.register(registerMeRoutes);
fastify.register(registerAccountRoutes);
fastify.register(registerExampleProjectsRoutes);
fastify.register(registerClerkWebhookRoutes);

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log("Server running on port 3000");
});
