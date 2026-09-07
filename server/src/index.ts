import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool, getPool } from "./config/database.js";
import { shutdownOcr } from "./services/ocr/ocrService.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  await getPool();
  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info("server_started", { port: env.port, env: env.nodeEnv });
  });

  const shutdown = async (signal: string) => {
    logger.info("server_shutdown", { signal });
    server.close(async () => {
      await shutdownOcr();
      await closePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.error("server_boot_failed", {
    category: "BOOT",
    status: 1,
  });
  if (error instanceof Error && env.nodeEnv !== "production") {
    process.stderr.write(`${error.message}\n`);
  }
  process.exit(1);
});
