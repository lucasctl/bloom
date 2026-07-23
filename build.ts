import tailwind from "bun-plugin-tailwind";

const result = await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  minify: true,
  plugins: [tailwind],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
for (const artifact of result.outputs) {
  console.log(`${artifact.path.replace(process.cwd(), ".")}  ${(artifact.size / 1024).toFixed(1)} KB`);
}
