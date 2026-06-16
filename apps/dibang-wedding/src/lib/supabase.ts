// Supabase 클라이언트 lazy 싱글톤 (UI/데이터 분리 P1-1).
//
// env 검증은 src/env.ts 의 t3-env 스키마가 부팅 시점에 처리한다.
// 본 모듈은 검증된 env 객체만 사용한다.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../env'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  // SSR/Node 환경 가드: storage는 브라우저에서만 의미. 함수 호출 시점 typeof window 분기로
  // ReferenceError 방지. supabase-js는 storage undefined 시 in-memory fallback. (UI/데이터 분리 P4-2)
  // env 검증은 src/env.ts 의 t3-env 스키마가 부팅 시점에 처리 (dev 66b854a 통합).
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined

  client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage,
    },
  })
  return client
}
