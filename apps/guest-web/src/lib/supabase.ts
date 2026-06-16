// Supabase 클라이언트 싱글톤(mecdisplay 워크스트림).
//
// 사용처: src/lib/displayQueries.ts (entries/messages 시드·catch-up fetch),
// src/pages/DisplayPage.tsx (Realtime 구독 두 트리거).
//
// v3 백엔드 컨벤션(service_role 접근)에서 벗어나 guest-web이 anon key로 직접 SELECT/
// Realtime 구독한다. RLS 정책은 마이그레이션 20260520120100_*_rls.sql 에 정의됨.
//
// env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 필수. 미설정 시 빌드/런타임 명시 에러.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../env'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
