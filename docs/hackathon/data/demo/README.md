# 데모-정렬 시뮬레이터 출력 (2026-06-21)

`_research/gathering-taxonomy-trust-balance/sim-demo-260621.mjs` 실행 결과. **시드 42 · 재현 가능.**

## 설정 (데모-정렬 — `sim-scale.mjs`와의 차이)
- 철수 **미혼**(본인 결혼식 없음) — 하객으로만 참여.
- **강병주 결혼식**이 앵커. 하객 = **철수·서아·하늘·하린**.
- **초단위 타임스탬프**, raw 이벤트 **~64.5k**(sim-scale 대비 10배).

## 결과
- 철수 Moi Credit **824 / 1000 · AAA**.
- 예측("내 결혼식에 누가 올까"): 예상 하객 **180** · 예상 부조 **1,398만원** · 무담보 웨딩 대출 한도 **1,358만원**.

## 파일
- `raw-events.csv` · `raw-events.json` — 1층 raw 이벤트(event·action·role→role, 초단위 ts).
- `prediction.json` — 하객·부조·대출 예측.
- `moi_timeseries.json` — Moi Credit 시계열(시간에 따라 변동 — '주식처럼').

## Phase 2 (추후)
앱 fixture(`personaProfiles` · 강병주 라운지 하객 · 광장 군중 · 디방인연 후보풀)를 이 sim 출력에서 **파생**해 앱↔sim 완전 일치.

> ⚠️ 기존 `../raw-events.*`(sim-scale 산출)와 **별개** — 둘 다 보존.
