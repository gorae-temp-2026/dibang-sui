/**
 * MainLayout — 하단 네비 4탭 스모크 (디방 통합 260620).
 *
 * 책임:
 *  - Inyeon · Event list · My event · Setting 4탭 노출.
 *  - 각 탭 → 올바른 경로(/inyeon, /wedding-list, /my-wedding, /settings) 매핑.
 *  - QR·DM 탭은 nav에서 제외(라우트 자체는 App.tsx에 유지).
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { MainLayout } from './MainLayout'

function renderNav(initialPath = '/inyeon') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="*" element={<div />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('MainLayout 하단 네비 4탭', () => {
  // 기본 언어 = ko → 라벨 인연/이벤트 리스트/나의 이벤트/설정 (i18n, en은 Inyeon/Event list/…).
  it('4탭(인연·이벤트 리스트·나의 이벤트·설정)을 노출한다', () => {
    renderNav()
    expect(screen.getByText('인연')).toBeInTheDocument()
    expect(screen.getByText('이벤트 리스트')).toBeInTheDocument()
    expect(screen.getByText('나의 이벤트')).toBeInTheDocument()
    expect(screen.getByText('설정')).toBeInTheDocument()
  })

  it('각 탭이 올바른 경로로 연결된다', () => {
    renderNav()
    expect(screen.getByRole('link', { name: '인연' })).toHaveAttribute('href', '/inyeon')
    expect(screen.getByRole('link', { name: '이벤트 리스트' })).toHaveAttribute('href', '/wedding-list')
    expect(screen.getByRole('link', { name: '나의 이벤트' })).toHaveAttribute('href', '/my-wedding')
    expect(screen.getByRole('link', { name: '설정' })).toHaveAttribute('href', '/settings')
  })

  it('QR·DM 탭은 nav에 노출하지 않는다', () => {
    renderNav()
    expect(screen.queryByText('QR')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '/dm' })).not.toBeInTheDocument()
  })
})
