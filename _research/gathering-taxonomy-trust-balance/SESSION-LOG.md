# SESSION-LOG — 대화 원문(트랜스크립트) 위치 기록

> 목적: compaction(컨텍스트 요약) 이후 또는 다음 세션의 에이전트가 **이전 대화 원문(jsonl)**을 빠르게 찾도록 경로를 남긴다.
> compaction 요약은 손실이 있으므로, 정확한 확인이 필요하면 아래 트랜스크립트 원문을 직접 읽는다.
> ARCHIVE.md는 사람이 읽는 정제 기록, 이 파일은 **기계 원본(jsonl)의 위치**를 가리킨다.

## 세션 인덱스

| 세션 시작일 | session_id | 트랜스크립트 jsonl (파일명 = 대화 UUID) | 비고 |
|---|---|---|---|
| 2026-06-10 ~ 06-15 | `local_8e0c5d0d-27f6-4523-9250-1c1a84180a5d` | `5e62f147-a2e0-49fc-a6d9-6e665c57046d.jsonl` | 모임 택소노미 1층 완성·17축 v2·05 H8~H11·2층 입구 설계. ARCHIVE 세션2 전문이 여기서 추출됨 |

## 경로 규칙 (host = 사용자 맥OS)

```
~/Library/Application Support/Claude/local-agent-mode-sessions/
  3ba40929-f9af-489b-b233-0095134cbcec/                 # 계정
  9c60725b-96c9-41e3-aa1a-0d87e0cbb778/                 # 워크스페이스
  local_<session_id>/                                   # 세션
  .claude/projects/<인코딩된-outputs-경로>/
  <대화 UUID>.jsonl                                      # ← 트랜스크립트 원문
```
- 같은 폴더의 `audit.jsonl`, `subagents/*.jsonl`은 본 대화가 아님(감사/하위에이전트 로그) — 제외.

## 찾는 법

### A) 샌드박스 bash에서 — 현재 세션 자기 트랜스크립트
outputs 마운트의 **형제 폴더** `.claude/projects/`에 있다(시스템 프롬프트의 outputs 절대경로 기준):
```bash
# <OUTPUTS_MOUNT> = 시스템 프롬프트 "Shell access"에 적힌 outputs 마운트 경로
ls -la <OUTPUTS_MOUNT>/../.claude/projects/*/*.jsonl | grep -v subagents | grep -v audit
```
예(이 세션): `/sessions/<vm>/mnt/outputs/../.claude/projects/...-kmsmea/5e62f147-….jsonl`
※ `<vm>`(예: great-magical-ptolemy)와 마운트 경로는 세션마다 바뀌므로, **상대경로 `../.claude/projects/`**로 접근한다. `/var/folders/...`의 임시 트랜스크립트는 macOS가 비우므로 신뢰하지 말 것.

### B) host 터미널에서 — 특정 세션 트랜스크립트
```bash
BASE=~/Library/Application\ Support/Claude/local-agent-mode-sessions
find "$BASE" -path '*<session_id>*' -name '*.jsonl' 2>/dev/null | grep -v subagents | grep -v audit
```

### C) 원문에서 Q&A만 추출 (verbatim)
jsonl 각 줄 = 메시지 1개. `message.role`이 `user`/`assistant`, `message.content`의 `type:"text"` 블록만 모으면 대화 본문. (thinking·tool_use·tool_result 제외, 세션 재개 중복 `Continue from where you left off`·동일발화 dedup.) 2026-06-15 세션2 추출이 이 방식.

## 다음 세션 에이전트에게 (인수인계 메모)

세션을 시작하거나 큰 전환 시, **위 "세션 인덱스" 표에 한 줄 추가**한다:
1. 샌드박스에서 A) 명령으로 자기 트랜스크립트 jsonl 경로·UUID를 확인.
2. `| 시작일 | local_<session_id> | <UUID>.jsonl | 한 줄 요약 |` 행을 표에 append.
3. compaction이 일어났는데 이전 원문이 필요하면, 직전 행의 jsonl을 A)/B)로 찾아 C) 방식으로 읽는다.
