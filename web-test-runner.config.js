import { esbuildPlugin } from "@web/dev-server-esbuild";
import { chromeLauncher } from "@web/test-runner-chrome";

export default {
  files: ["src/**/*.test.ts", "src/**/*.spec.ts"],
  plugins: [esbuildPlugin({ ts: true })],
  concurrency: 10,
  nodeResolve: true,
  watch: true,
  browsers: [
    chromeLauncher({
      concurrency: 1,
      launchOptions: {
        args: [
          "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ],
        headless: false,
      },
    }),
  ],
};
