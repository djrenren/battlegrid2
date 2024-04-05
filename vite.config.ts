import { defineConfig } from 'vitest/config'

export default defineConfig({
  // ...
  test: {
    globalSetup: [
      "test/echo-server.ts",
      "test/peerjs-server.ts"
    ],
    coverage: {
      provider: 'istanbul'
    },
    browser: {
      enabled: true,
      name: 'chrome',
      headless: true,
    }
  }

})