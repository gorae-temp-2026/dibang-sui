# Print Conventions — `_architecture/` 다이어그램 인쇄 규약

`_architecture/diagram-*-print.html` 파일이 따르는 인쇄 출력 규약의 단일 진실원천이다. 새 다이어그램 print HTML을 만들거나 기존 HTML을 수정할 때 이 규약을 따른다.

## 1. 페이지 기본

- 페이지 사이즈: A4 (`@page { size: A4 ...; margin: 0; }`)
- 모든 페이지 여백 0, 본문 영역 풀 사용
- `html, body { margin: 0; padding: 0; background: white; }`

## 2. SVG 색 후처리 (스크립트 자동)

`scripts/generate-*-d2.py`가 d2 → svg 렌더 후 자동 적용. d2 파일은 손대지 않음.

- sql_table 헤더 `class_header` rect fill: 검정/메서드색 → 흰색 (inline `style="fill:..."`로 강제 — d2 svg 내장 CSS가 fill 속성을 override하므로 style 필수)
- 헤더 y 범위 안 text fill → 원래 헤더 색 (api 메서드 색, db 검정)
- 헤더 하단에 horizontal `<line stroke="#0A0F25" stroke-width="2">` 추가 (헤더-본문 시각 경계)
- api-contract 컨테이너 외곽 rect (`fill-B5`/`fill-B4`) → 흰색
- d2가 schemas 헤더 강조용으로 추가한 class 없는 `fill="black"` rect → 흰색 + 같은 y 범위 text 검정

외곽선·셀 구분선·column 색은 d2 default 유지.

## 3. 다이어그램별 레이아웃

### 3-1. `diagram-db-schema-print.html` — A4 portrait × 2장 (가로 분할)

| 항목 | 값 |
|---|---|
| 페이지 | A4 portrait (21cm × 29.7cm) × 2장 |
| SVG 폭 | 42cm (A4 폭 × 2, 1배 fit) |
| SVG 비율 | 5452:3474 ≈ 1.569:1 |
| SVG 높이 | 42 / 1.569 ≈ 26.77cm |
| 수직 정렬 | `top: 1.47cm` (위·아래 여백 (29.7-26.77)/2씩 중앙) |
| 페이지 분할 | 좌→우. page-1 `left:0`, page-2 `left:-21cm` |

두 페이지를 좌우로 붙이면 A3 가로(42 × 29.7cm) 한 장 효과.

### 3-2. `diagram-api-contract-print.html` — A4 landscape × N장 (세로 분할)

| 항목 | 값 |
|---|---|
| 페이지 | A4 landscape (29.7cm × 21cm) × N장 |
| SVG 폭 | 29.7cm (A4 가로 폭, 1배 fit) |
| SVG 비율 | 4027:30389 ≈ 1:7.546 |
| SVG 높이 | 29.7 × 30389/4027 ≈ 224.10cm |
| 페이지 수 N | `ceil(224.10 / 21) = 11장` |
| 페이지 분할 | 위→아래. page-K `top: -(K-1) × 21cm` |
| 마지막 페이지 | 224.10 - 10×21 = 14.10cm 채워짐 |

## 4. 출력 방법

1. Chrome에서 print HTML 파일 열기 (file:// 직접)
2. ⌘P / Ctrl+P → "PDF로 저장"
3. 용지 사이즈: A4, **여백: 없음**, 배경 그래픽 켜기, 머리글·바닥글 끄기
4. 페이지 수가 위 표 N과 일치하는 PDF 산출

## 5. 새 다이어그램 추가 절차

1. d2 파일 작성 → svg 렌더 (`scripts/generate-*-d2.py` 자동화 권장)
2. svg viewBox로 비율 측정
3. 출력 방향 결정 (portrait vs landscape) — 일반적으로 가로/세로 비율에 따라
4. SVG 폭을 페이지 폭에 1배 또는 N배 fit
5. 격자 계산:
   - cols = ceil(svg 폭 / 페이지 폭)
   - rows = ceil(svg 높이 / 페이지 높이)
   - 페이지 수 = cols × rows
6. `_architecture/diagram-<name>-print.html` 신설 — §1·§2 규약 따름
7. §3 표에 한 행 추가

## 6. 갱신 시점

- svg 비율이 크게 바뀌면 (콘텐츠 추가·제거로 viewBox 변동) §3 표 수치 + 격자 페이지 수 재계산 필요
- 직전 검토: api-contract 4027:30389 (2026-05-26), db-schema 5452:3474 (2026-05-26)
