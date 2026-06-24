/**
 * Go API에 zkLogin JWT를 Bearer 토큰으로 주입하는 interceptor.
 *
 * hey-api client의 request interceptor로 등록.
 * zkLogin 세션의 JWT를 sessionStorage에서 읽어 Authorization 헤더에 넣는다.
 * Go API의 AuthMiddleware가 Google JWT를 직접 검증한다.
 */
import { client } from '@gorae/contracts/client.gen'

const SESSION_KEY = 'dibang.zklogin.session'
const DEV_KEY = 'dibang.dev.sk'

export function setupApiAuthInterceptor(): void {
  client.interceptors.request.use((req) => {
    // dev 모드면 X-Dev-Auth 헤더
    if (sessionStorage.getItem(DEV_KEY)) {
      req.headers.set('X-Dev-Auth', '1')
      return req
    }
    // zkLogin 세션에서 JWT 추출
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        const session = JSON.parse(raw)
        if (session.jwt) {
          req.headers.set('Authorization', `Bearer ${session.jwt}`)
        }
      } catch { /* ignore */ }
    }
    return req
  })
}
