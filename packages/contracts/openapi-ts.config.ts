import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './api-contract.yaml',
  output: {
    path: './src',
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    'zod',
    '@tanstack/react-query',
    {
      name: '@hey-api/client-fetch',
      // baseUrl is intentionally NOT hardcoded here.
      // The generated client.gen.ts calls createClientConfig() from the
      // runtime file below, which resolves baseUrl from env at runtime.
      // See runtime/hey-api.ts for the resolution order.
      runtimeConfigPath: './runtime/hey-api.ts',
    },
  ],
})
