import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

  // In Vercel serverless, bundling Node dependencies can cause runtime issues
  // (e.g. dynamic require of builtins). We'll bundle only our workspace code
  // (@workspace/*) and externalize all normal node_modules deps.

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !dep.startsWith("@workspace/"));

  await esbuild({
    // For Vercel serverless, bundle the Express app (no listen()).
    entryPoints: [path.resolve(__dirname, "src/app.ts")],
    platform: "node",
    bundle: true,
    // Our server code is ESM (uses import.meta.url), so output must be ESM too.
    format: "esm",
    outfile: path.resolve(distDir, "app.mjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

