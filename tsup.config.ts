import { defineConfig } from "tsup";
import { peerDependencies } from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true, // generate .d.ts files
  sourcemap: true,
  clean: true,
  external: [
    ...Object.keys(peerDependencies || {}),
  ]
});
