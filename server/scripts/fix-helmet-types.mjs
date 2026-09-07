import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function findHelmetPackageJson() {
  const starts = [process.cwd(), here];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i += 1) {
      const candidate = join(dir, "node_modules", "helmet", "package.json");
      if (existsSync(candidate)) {
        return candidate;
      }
      const parent = dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }
  return null;
}

const packageJsonPath = findHelmetPackageJson();
if (!packageJsonPath) {
  console.warn("fix-helmet-types: helmet is not installed; skipping");
  process.exit(0);
}

const typesMjs = join(dirname(packageJsonPath), "index.d.mts");
const typesCjs = join(dirname(packageJsonPath), "index.d.cts");
if (!existsSync(typesMjs) || !existsSync(typesCjs)) {
  throw new Error("fix-helmet-types: helmet type declarations are missing");
}

const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const nextExports = {
  import: {
    types: "./index.d.mts",
    default: "./index.mjs",
  },
  require: {
    types: "./index.d.cts",
    default: "./index.cjs",
  },
};

const alreadyPatched =
  pkg.types === "./index.d.mts" &&
  pkg.exports &&
  typeof pkg.exports === "object" &&
  pkg.exports.import &&
  typeof pkg.exports.import === "object" &&
  pkg.exports.import.types === "./index.d.mts";

if (alreadyPatched) {
  process.exit(0);
}

pkg.types = "./index.d.mts";
pkg.exports = nextExports;
writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, "\t")}\n`);
