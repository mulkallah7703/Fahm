import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import sql from "mssql";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

type SqlModule = typeof sql;

let pool: sql.ConnectionPool | null = null;
let driver: SqlModule = sql;

const require = createRequire(import.meta.url);

function loadWindowsDriver(): SqlModule {
  try {
    return require("mssql/msnodesqlv8") as SqlModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    throw new Error(
      `Windows SQL authentication requires msnodesqlv8. Install it or set DB_AUTH=sql. (${message})`,
    );
  }
}

function windowsConnectionString(): string {
  const server = env.db.instance
    ? `${env.db.server}\\${env.db.instance}`
    : env.db.server;
  const encrypt = env.db.encrypt ? "Yes" : "No";
  const trust = env.db.trustServerCertificate ? "Yes" : "No";
  return [
    `Driver={${env.db.odbcDriver}}`,
    `Server=${server}`,
    `Database=${env.db.database}`,
    "Trusted_Connection=Yes",
    `Encrypt=${encrypt}`,
    `TrustServerCertificate=${trust}`,
  ].join(";");
}

function buildConfig(): sql.config {
  const options: sql.config["options"] = {
    encrypt: env.db.encrypt,
    trustServerCertificate: env.db.trustServerCertificate,
    enableArithAbort: true,
    appName: "FAHM",
  };

  if (env.db.auth === "windows") {
    driver = loadWindowsDriver();
    return {
      server: env.db.server,
      database: env.db.database,
      connectionString: windowsConnectionString(),
      pool: {
        min: env.db.poolMin,
        max: env.db.poolMax,
        idleTimeoutMillis: 30_000,
      },
    } as unknown as sql.config;
  }

  if (!env.db.user || !env.db.password) {
    throw new Error("DB_USER and DB_PASSWORD are required when DB_AUTH=sql");
  }

  return {
    server: env.db.server,
    port: env.db.port,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,
    options,
    pool: {
      min: env.db.poolMin,
      max: env.db.poolMax,
      idleTimeoutMillis: 30_000,
    },
  };
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) return pool;
  const config = buildConfig();
  pool = await new driver.ConnectionPool(config).connect();
  logger.info("sql_connected", {
    database: env.db.database,
    auth: env.db.auth,
    server: env.db.server,
  });
  return pool;
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.close();
  pool = null;
}

export async function withTransaction<T>(
  work: (tx: sql.Transaction, request: () => sql.Request) => Promise<T>,
): Promise<T> {
  const connection = await getPool();
  const tx = new driver.Transaction(connection);
  await tx.begin();
  try {
    const result = await work(tx, () => new driver.Request(tx));
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      /* already rolled back */
    }
    throw error;
  }
}

export function storageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../", env.storage.root);
}
