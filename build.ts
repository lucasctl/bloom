import tailwind from "bun-plugin-tailwind";
import { cp, rm } from "node:fs/promises";

await rm("./dist", { recursive: true, force: true });

// app: html entry, hashed assets
const app = await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  minify: true,
  plugins: [tailwind],
});

// service worker: stable unhashed name at the root scope
const sw = await Bun.build({
  entrypoints: ["./src/sw.ts"],
  outdir: "./dist",
  naming: "[name].js",
  minify: true,
});

for (const result of [app, sw]) {
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  for (const artifact of result.outputs) {
    console.log(`${artifact.path.replace(process.cwd(), ".")}  ${(artifact.size / 1024).toFixed(1)} KB`);
  }
}

// static PWA files, referenced by absolute path — not bundled
await cp("./src/manifest.webmanifest", "./dist/manifest.webmanifest");
await cp("./src/icons", "./dist/icons", { recursive: true });
console.log("./dist/manifest.webmanifest + icons copied");
