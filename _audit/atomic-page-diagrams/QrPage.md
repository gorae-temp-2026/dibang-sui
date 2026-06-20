# QrPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/qr` (바텀탭)
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** 스텁. 카메라 QR 스캐너 구현 예정. 정적 화면, 분기·상태 없음.

```mermaid
flowchart TB
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /qr (바텀탭)"]):::term --> screen["QR 스캔 화면 — 카메라 스캐너 (구현 예정·정적·분기 없음)"]:::flat
```
