/**
 * Dev-only 로그 수집기 — IndexedDB 기반.
 *
 * VITE_DEV_PRIVATE_KEY가 설정된 dev 환경에서만 활성화.
 * production(환경변수 없음)에서는 모든 API가 no-op.
 *
 * 사용: import { devLogger } from './devLogger'
 *       devLogger.log('click', 'button_press', { target: '#submit' })
 */

export type LogCategory =
  | 'click'
  | 'navigation'
  | 'error'
  | 'state'
  | 'network'
  | 'render'
  | 'console'
  | 'sui'
  | 'auth'

export interface LogEntry {
  id?: number
  ts: number
  category: LogCategory
  event: string
  payload: unknown
  meta?: Record<string, unknown>
  correlationId?: string
}

export interface LogQuery {
  category?: LogCategory
  since?: number
  until?: number
  limit?: number
  search?: string
  correlationId?: string
}

const DB_NAME = 'dev-logs'
const STORE_NAME = 'logs'
const DB_VERSION = 1
const MAX_ENTRIES = 100_000
const PRUNE_BATCH = 10_000

let _db: IDBDatabase | null = null
let _enabled = false
let _isLogging = false
let _correlationId: string | null = null

function isDevEnabled(): boolean {
  try {
    return !!import.meta.env?.VITE_DEV_PRIVATE_KEY
  } catch {
    return false
  }
}

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('ts', 'ts', { unique: false })
        store.createIndex('category', 'category', { unique: false })
        store.createIndex('correlationId', 'correlationId', { unique: false })
      }
    }
    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

async function pruneIfNeeded(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const countReq = store.count()
    countReq.onsuccess = () => {
      if (countReq.result <= MAX_ENTRIES) { resolve(); return }
      const delTx = db.transaction(STORE_NAME, 'readwrite')
      const delStore = delTx.objectStore(STORE_NAME)
      const idx = delStore.index('ts')
      let deleted = 0
      const cursor = idx.openCursor()
      cursor.onsuccess = () => {
        const c = cursor.result
        if (c && deleted < PRUNE_BATCH) {
          c.delete()
          deleted++
          c.continue()
        } else {
          resolve()
        }
      }
      cursor.onerror = () => resolve()
    }
    countReq.onerror = () => resolve()
  })
}

async function writeLog(entry: LogEntry): Promise<void> {
  try {
    const db = await openDB()
    await pruneIfNeeded(db)
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.add(entry)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // IndexedDB 실패 시 조용히 무시
  }
}

const _queue: LogEntry[] = []
let _flushing = false

async function flushQueue(): Promise<void> {
  if (_flushing) return
  _flushing = true
  try {
    while (_queue.length > 0) {
      const entry = _queue.shift()!
      await writeLog(entry)
    }
  } finally {
    _flushing = false
  }
}

function log(category: LogCategory, event: string, payload?: unknown, meta?: Record<string, unknown>): void {
  if (!_enabled || _isLogging) return
  _isLogging = true
  const entry: LogEntry = {
    ts: Date.now(),
    category,
    event,
    payload: payload ?? null,
    meta,
    correlationId: _correlationId ?? undefined,
  }
  _queue.push(entry)
  _isLogging = false
  flushQueue()
}

async function query(opts: LogQuery = {}): Promise<LogEntry[]> {
  if (!_enabled) return []
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const results: LogEntry[] = []

    let source: IDBRequest
    if (opts.correlationId) {
      const idx = store.index('correlationId')
      source = idx.openCursor(IDBKeyRange.only(opts.correlationId))
    } else {
      const idx = store.index('ts')
      source = idx.openCursor(null, 'prev')
    }

    source.onsuccess = () => {
      const cursor = source.result as IDBCursorWithValue | null
      if (!cursor) { resolve(results); return }
      const entry = cursor.value as LogEntry
      if (opts.category && entry.category !== opts.category) { cursor.continue(); return }
      if (opts.since && entry.ts < opts.since) { cursor.continue(); return }
      if (opts.until && entry.ts > opts.until) { cursor.continue(); return }
      if (opts.search) {
        const str = JSON.stringify(entry.payload) + ' ' + entry.event
        if (!str.toLowerCase().includes(opts.search.toLowerCase())) { cursor.continue(); return }
      }
      results.push(entry)
      if (opts.limit && results.length >= opts.limit) { resolve(results); return }
      cursor.continue()
    }
    source.onerror = () => reject(source.error)
  })
}

async function clear(): Promise<void> {
  if (!_enabled) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function count(): Promise<number> {
  if (!_enabled) return 0
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function setCorrelation(id: string | null): void {
  _correlationId = id
}

function getCorrelation(): string | null {
  return _correlationId
}

function generateCorrelationId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function init(): void {
  _enabled = isDevEnabled()
}

export const devLogger = {
  init,
  log,
  query,
  clear,
  count,
  setCorrelation,
  getCorrelation,
  generateCorrelationId,
  get enabled() { return _enabled },
}
