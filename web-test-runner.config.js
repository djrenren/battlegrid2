import { esbuildPlugin } from "@web/dev-server-esbuild";
export default {
  files: ["src/**/*.test.ts", "src/**/*.spec.ts"],
  plugins: [esbuildPlugin({ ts: true })],
  concurrency: 10,
  nodeResolve: true,
  watch: true,
};
