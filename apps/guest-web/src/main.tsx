import { bootstrapWithInAppGuard } from '@gorae/web-utils'

// 카카오톡 등 인앱 브라우저면 외부 브라우저로 리다이렉트, 정상 브라우저면 앱 부트.
// bootstrap module은 부수효과 없는 mount() 함수만 export하므로 명시적으로 호출한다.
bootstrapWithInAppGuard(async () => {
  const { mount } = await import('./bootstrap')
  mount()
})
