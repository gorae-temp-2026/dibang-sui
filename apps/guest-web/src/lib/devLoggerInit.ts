/**
 * devLogger 전역 이벤트 수집 초기화.
 * 앱 부팅 시 1회 호출(bootstrap.tsx).
 */
import { devLogger } from './devLogger'

function getSelector(el: EventTarget | null): string {
  if (!el || !(el instanceof HTMLElement)) return ''
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : ''
  return `${tag}${id}${cls}`
}

export function initDevLogger(): void {
  devLogger.init()
  if (!devLogger.enabled) return

  // 1. Click — correlationId 생성 + 후속 이벤트에 전파
  let correlationTimer: ReturnType<typeof setTimeout> | null = null
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null
    const cid = devLogger.generateCorrelationId()
    devLogger.setCorrelation(cid)
    devLogger.log('click', 'click', {
      selector: getSelector(target),
      text: target?.innerText?.slice(0, 50) ?? '',
      x: e.clientX,
      y: e.clientY,
    })
    if (correlationTimer) clearTimeout(correlationTimer)
    correlationTimer = setTimeout(() => { devLogger.setCorrelation(null) }, 3000)
  }, true)

  // 2. Navigation — pushState/replaceState/popstate
  const origPush = history.pushState.bind(history)
  const origReplace = history.replaceState.bind(history)
  history.pushState = function (...args) {
    const from = location.pathname
    origPush(...args)
    devLogger.log('navigation', 'pushState', { from, to: location.pathname })
  }
  history.replaceState = function (...args) {
    const from = location.pathname
    origReplace(...args)
    devLogger.log('navigation', 'replaceState', { from, to: location.pathname })
  }
  window.addEventListener('popstate', () => {
    devLogger.log('navigation', 'popstate', { to: location.pathname })
  })

  // 3. Errors
  window.addEventListener('error', (e) => {
    devLogger.log('error', 'window_error', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack?.slice(0, 500),
    })
  })

  // 4. Unhandled rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason
    devLogger.log('error', 'unhandled_rejection', {
      message: reason?.message ?? String(reason),
      stack: reason?.stack?.slice(0, 500),
    })
  })

  // 5. Console 가로채기 (warn/error/log/info)
  const origConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
  }
  for (const level of ['log', 'warn', 'error', 'info'] as const) {
    console[level] = (...args: unknown[]) => {
      origConsole[level](...args)
      devLogger.log('console', level, {
        args: args.map((a) => {
          try {
            if (a instanceof Error) return `Error: ${a.message}`
            return typeof a === 'object' ? JSON.stringify(a)?.slice(0, 200) : String(a).slice(0, 200)
          } catch { return String(a).slice(0, 200) }
        }),
      })
    }
  }

  // 6. Network — fetch 패치
  const origFetch = window.fetch.bind(window)
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
    const method = (typeof args[0] === 'string' ? args[1]?.method : (args[0] as Request).method) ?? 'GET'
    const t0 = Date.now()
    try {
      const res = await origFetch(...args)
      devLogger.log('network', 'fetch', {
        url: url.slice(0, 200),
        method,
        status: res.status,
        duration: Date.now() - t0,
        ok: res.ok,
      })
      return res
    } catch (err) {
      devLogger.log('network', 'fetch_error', {
        url: url.slice(0, 200),
        method,
        duration: Date.now() - t0,
        error: (err as Error).message?.slice(0, 100),
      })
      throw err
    }
  }

  // 7. sui:tx-success 이벤트
  window.addEventListener('sui:tx-success', ((e: CustomEvent) => {
    devLogger.log('sui', 'tx_success', { digest: e.detail?.digest })
  }) as EventListener)

  devLogger.log('sui', 'devLogger_initialized', { ts: Date.now() })
}
