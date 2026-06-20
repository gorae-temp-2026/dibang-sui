# 해커톤 임시 도입 라이브러리 (tech-stack-map 정식 등재 전 표기)

> 2026-06-20 SUI 해커톤(D-2) feat/inyeon. **대표 단독 결정(박태원 바쁨)** — 박태원 리뷰 때 `tech-stack-map.html`에 일괄 정식 등재.
> 큐레이션된 HTML viz를 직접 손대지 않기 위해 이 사이드카 노트로 표기만 남김.

| 라이브러리 | 용도 | 버전 | 상태 |
|---|---|---|---|
| `@radix-ui/react-dialog` | shadcn Sheet/Dialog (하단 시트·모달) | ^1.1 | 해커톤 임시 |
| `class-variance-authority` · `clsx` · `tailwind-merge` | shadcn cn()/variants | latest | 해커톤 임시 |
| `lucide-react` | 아이콘 | ^1.x | 해커톤 임시 |
| `react-force-graph-2d` | ⑤ 인연 연결 그래프(사진 노드, 2D) | latest | 해커톤 임시 |
| `d3-hierarchy` · `d3-shape` | ⑤ signal sunburst(partition + arc) | latest | 해커톤 임시 |
| **PixiJS** (예정) | ④ 모이가모인곳 2.5D 미니룸 | — | 미설치(④ 착수 시) |

- `framer-motion`은 이미 tech-stack-map 등재됨(스와이프·레일 애니메이션) — 임시 아님.
- pnpm 핀 이슈: `packageManager: pnpm@9.15.0` 바이너리 부재 → `npm_config_manage_package_manager_versions=false`로 우회 설치.
