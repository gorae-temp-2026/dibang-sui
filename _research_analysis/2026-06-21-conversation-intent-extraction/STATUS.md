# 진행상황 (STATUS) — 대화기록 의도 발굴 6단계

- 의도 원천: [`_TASKS/00-INTENT-CHARTER.md`](./_TASKS/00-INTENT-CHARTER.md) (원문 프롬프트 verbatim 포함)
- 플랜: [`_TASKS/01-MASTER-TASK-PLAN.md`](./_TASKS/01-MASTER-TASK-PLAN.md)

## 핵심 방법 결정 (투명 기록)
- **1·2차 추출 = 결정적 스크립트.** "해석·압축 금지, 잘라내기만"을 LLM보다 확실히 보장.
- **3차부터 서브에이전트(읽기전용)** — 슬라이스 읽고 **버릴 인덱스만** 반환, 텍스트 변형 없음. 중앙 재구성이 cut-only 보장.
- 거대파일은 스크립트 스트리밍(1·2차)·청크 슬라이스(3차)로 처리. 원문 전량 read 보장.

## 단계별 진행

| 단계 | 상태 | 결과 |
|---|---|---|
| P0 메타 | ✅ | 폴더 골격, 매니페스트(160파일/700MB/195k줄), 인스턴스, 스크립트, 헌장 |
| P1 1차추출 | ✅ | 160유닛, 실패 0, 원문 전량 read. 출력 62MB |
| P1.V 검증 | ✅ | 내용라인 559k 전수 cut-only, 위반 0 |
| P2 2차추출 | ✅ | USERMETA+노이즈 RESULT 제거, 파일별 50% floor, 전체 잔존 96.9% |
| P2.V 검증 | ✅ | subset 위반 0, 50%미만 0, 잔존 96.9% |
| P3 3차추출 | ✅ | 288유닛 서브에이전트. cut-only 위반 0, **진짜 USER 발화 0건 삭제**(보존 94.8%), 드롭 34.2%(plumbing/UI 노이즈) |
| P3.V 검증 | ✅ | subset 0·USER 보호 적용·160파일 커버 |
| P4 4차가공 | ✅ | 부록 10개(출처 920건), pass3 뼈대 100% 보존, 분량 증가 |
| P4.V 검증 | ✅ | 부록 존재·인용·뼈대 diff 동일 |
| P5 5차가공 | ✅ | pass4→pass5 보존(대화 verbatim, 왜곡 0) |
| P5.V 검증 | ✅ | pass5==pass4 |
| P6 6차가공 | ✅ | 7규격 산출(INDEX·SUMMARY·HANDBOOK·GLOSSARY·FAQ·DECISION-LOG·INTENT-TIMELINE) |
| P6.V 검증 | ✅ | 7규격 존재·뼈대 키워드 49/49 100% 커버·요약본 포함 |

## ✅ 완료 — 최종 산출
`06-process-pass6/` : SUMMARY → HANDBOOK(메인) → GLOSSARY → FAQ → DECISION-LOG → INTENT-TIMELINE (+INDEX). ~90KB.

## P3 세부
- 재구성(`run_p3_reconstruct.py`): 드롭ID를 [0,n_blocks) 클램프 + 파일 전 청크 완료 시에만 pass3 확정 → cut-only 보장.
- 미해결: args 전사 오타로 누락 위험 2유닛(C/a0764698#5, F/e1700ad7#0) — 임베드 스크립트는 clean이라 정상 처리 예상, 완료 후 확인.

## cut-only 검증 방법
- 불변식: pass 출력의 모든 내용 라인/블록은 직전 단계의 연속 부분(또는 부분집합). 헤더·절단마커·빈줄 제외 전수 검사.

## 산출물 위치
```
01-extract-pass1/  02-extract-pass2/  03-extract-pass3/(진행)
_manifest/source-manifest.tsv
_TASKS/{00-INTENT-CHARTER, 01-MASTER-TASK-PLAN, 03-P3-AGENT-BRIEFING, 04-P4-DESIGN}.md
_TASKS/instances/{phase1,phase2,phase3}-tasks.tsv, p3-chunks/, p3-decisions/
_TASKS/ledger/*.tsv   _TASKS/scripts/*.py + p3_workflow.js
```
