// Runtime client config hook for hey-api codegen.
// Referenced from openapi-ts.config.ts via `runtimeConfigPath`.
// Generated client.gen.ts calls `createClientConfig()` at module evaluation
// time, so this function must NOT throw — throwing would turn any import of
// '@gorae/contracts' into a side-effectful explosion.
//
// Responsibility split:
//   - This hook auto-resolves baseUrl from env at codegen client creation,
//     so calling apps that set VITE_API_BASE_URL (or equivalents) get the
//     correct baseUrl without any imperative bootstrap code.
//   - This hook also pins `credentials: 'include'` so that calling apps do
//     not need to call `client.setConfig({ credentials: 'include' })` from
//     their entry / bootstrap. Cookie-based auth requires this and treating
//     it as a runtime concern keeps SDK policy out of app entry files.
//   - Calling apps SHOULD still treat client as injectable and pass
//     `options.client` (or call client.setConfig({ baseUrl })) when they
//     want to override per-environment. The codegen default baseUrl baked
//     into client.gen.ts (from the OpenAPI `servers` entry) is a last-resort
//     fallback only — production code MUST set env explicitly.
//
// Resolution order for baseUrl:
//   1. override.baseUrl (whatever codegen / caller passed in)
//   2. import.meta.env.VITE_API_BASE_URL (Vite apps)
//   3. process.env.NEXT_PUBLIC_API_BASE_URL (Next.js apps, if any)
//   4. process.env.API_BASE_URL (Node / SSR)
//   5. fall through to override value (codegen default)

import type { CreateClientConfig } from '../src/client/types.gen'

type ImportMetaEnvShape = {
  VITE_API_BASE_URL?: string
}

const readImportMetaEnv = (): ImportMetaEnvShape | undefined => {
  try {
    // import.meta.env is only populated by Vite-style bundlers. Guarded so
    // Node / Jest contexts without a bundler don't crash.
    return (import.meta as unknown as { env?: ImportMetaEnvShape }).env
  } catch {
    return undefined
  }
}

const readProcessEnv = (): Record<string, string | undefined> | undefined => {
  try {
    // `process` may be undefined in browser bundles without a polyfill, and
    // its type may be absent in tsconfigs without "node" in types. We access
    // it through globalThis to keep this file type-portable across apps.
    const p = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    return p?.env
  } catch {
    return undefined
  }
}

const resolveBaseUrl = (overrideBaseUrl?: string): string | undefined => {
  const viteEnv = readImportMetaEnv()
  if (viteEnv?.VITE_API_BASE_URL) return viteEnv.VITE_API_BASE_URL

  const procEnv = readProcessEnv()
  if (procEnv?.NEXT_PUBLIC_API_BASE_URL) return procEnv.NEXT_PUBLIC_API_BASE_URL
  if (procEnv?.API_BASE_URL) return procEnv.API_BASE_URL

  return overrideBaseUrl
}

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: resolveBaseUrl(config?.baseUrl),
  credentials: 'include',
})
