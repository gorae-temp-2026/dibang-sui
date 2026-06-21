# dibang-sui 온보딩 (최종 산출) — INDEX

이 폴더(`06-process-pass6/`)는 **700MB 대화기록 + 현 프로젝트 문서·코드**를 6단계 파이프라인으로 정제·합성한 **신규 팀원 온보딩 자료**의 최종본이다.

## 읽는 순서
1. **[`SUMMARY.md`](./SUMMARY.md)** — 한 장 요약. 여기서 시작.
2. **[`HANDBOOK.md`](./HANDBOOK.md)** — 메인 문서(서사형): 왜→무엇→어떻게→현황→여정→첫걸음.
3. **[`GLOSSARY.md`](./GLOSSARY.md)** — 용어집(도메인·기술·앱) 40개.
4. **[`FAQ.md`](./FAQ.md)** — 오너가 실제로 던진 질문 22문항 + 근거 답변.
5. **[`DECISION-LOG.md`](./DECISION-LOG.md)** — 주요 결정 32건(근거·번복 포함).
6. **[`INTENT-TIMELINE.md`](./INTENT-TIMELINE.md)** — 의도 진화 4단계(v3 레거시→Sui 온체인).

보조 입력: `_synthesis-inputs/`(USER 발화 코퍼스 5,586개 발화, 세션 의도 note 288개).

## 어떻게 만들어졌나 (출처·재현성)
대상: dibang-sui(+워크트리) & digital-guestbook-v3(+워크트리)의 **메인 대화 160세션, 700MB, 195k줄**.

| 단계 | 한 일 | 규칙 | 검증 결과 |
|---|---|---|---|
| 1차 추출 | 질의응답+도구실행+맥락만, 잘라내기 | 결정적 스크립트, 해석·압축 금지 | cut-only 위반 0 (559k줄 전수) |
| 2차 추출 | 진짜 불필요만 제거 | cut-only, 파일별 50%+ 잔존 | 잔존 96.9%, 위반 0 |
| 3차 추출 | 모순·레거시·무연결 제거 | 서브에이전트가 드롭ID만, 중앙 재구성 | cut-only 위반 0, **진짜 USER 발화 0건 삭제**(보존 94.8%) |
| 4차 가공 | 현 문서·코드 중요부 덧붙이기 | 압축 아닌 추가, pass3 뼈대 보존 | 부록 10개·출처 920건, 뼈대 100% 보존 |
| 5차 가공 | 표현만 다듬기 | 왜곡·압축 금지(대화는 verbatim) | pass4==pass5(왜곡 0) |
| 6차 가공 | 다규격 형식화 + 요약 | 실질 합성, 뼈대 보존 | 본 폴더 산출 |

- 의도 원천(불변): `../_TASKS/00-INTENT-CHARTER.md`(오너 원문 프롬프트 verbatim 포함).
- 재현 스크립트·원장: `../_TASKS/scripts/*.py`, `../_TASKS/ledger/*.tsv`.
- 단계별 원본: `../01-extract-pass1` ~ `../05-process-pass5`.

## 주의 (자료가 적시한 긴장점 — 온보딩에 중요)
- **앱 경계 vs 코드 현실**: 규칙은 "guest-web에 zkLogin/온체인 금지"지만 코드엔 dev keypair 경로가 실재. (HANDBOOK §2-3)
- **SBT 정정 대기 3건**: GuestbookEntry·CashGiftRecord·Ium이 아직 `key+store` → `key`-only 정정 필요.
- **결정값 임의성**: 신용 가중치는 first-cut, 실데이터 보정 전.
- 충돌 시 원본(`_onboarding`·`_architecture`) 우선.
