#!/usr/bin/env python3
"""깨끗한 p3-pending-compact.json을 읽어 units를 임베드한 self-contained 워크플로 .js 생성.
args 의존/전사오타 제거. 출력 .js를 Workflow({scriptPath}) 로 실행."""
import json, os

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"
units = json.load(open(os.path.join(ROOT, "_TASKS", "instances", "p3-pending-compact.json")))
units_js = json.dumps(units, ensure_ascii=False)
CHUNKDIR = os.path.join(ROOT, "_TASKS", "instances", "p3-chunks")
CHARTER = os.path.join(ROOT, "_TASKS", "00-INTENT-CHARTER.md")

js = '''export const meta = {
  name: 'p3-contradiction-legacy-cut',
  description: 'P3 3차 추출: 세션 슬라이스별 모순·레거시·무연결 블록의 드롭ID만 선별(cut-only).',
  phases: [{ title: 'P3-select', detail: '유닛별 드롭 인덱스 선별' }],
}
const CHUNKDIR = %s
const CHARTER = %s
const RULES = %s
const SCHEMA = { type:'object', additionalProperties:false, properties:{ drop_local:{type:'array',items:{type:'integer'}}, note:{type:'string'} }, required:['drop_local','note'] }
const units = %s
log('P3 유닛 ' + units.length + '개 처리 시작')
const results = await pipeline(units, (u) => {
  const code=u[0], base=u[1], idx=u[2]
  const slice = CHUNKDIR + '/' + code + '__' + base + '__u' + idx + '.blocks.jsonl'
  const prompt = RULES + '\\n\\n[대상] 아래 슬라이스 파일을 Read로 읽어라(각 줄=1블록, 로컬 0-base 인덱스=줄번호-1):\\n' + slice + '\\n\\n규칙 원문: ' + CHARTER + '\\n\\n[반환] drop_local(로컬 인덱스 배열)과 note만. 중앙에서 원문 블록 그대로 재구성하므로 인덱스 정확성만 중요.'
  return agent(prompt, { label: 'P3:' + code + '/' + base.slice(0,8) + '#' + idx, phase:'P3-select', schema: SCHEMA, effort:'medium' })
    .then((r) => ({ code, base, unit_idx: idx, drop_local: (r && r.drop_local) || [], note: (r && r.note) || '' }))
})
const ok = results.filter(Boolean)
log('완료: ' + ok.length + '/' + units.length)
return ok
''' % (json.dumps(CHUNKDIR), json.dumps(CHARTER),
       json.dumps(  # RULES
        "너는 '대화기록 의도 발굴' 파이프라인의 3차 추출 작업자다. 한 세션(또는 그 일부)의 pass2 블록에서 버릴 블록의 로컬 인덱스만 고른다. 텍스트를 절대 만들거나 바꾸지 않는다(cut-only). 인덱스만 고른다. "
        "블록 형식: 각 줄={k,t,name?}. k는 USER(★사람발화)/ASSISTANT/TOOL/RESULT. "
        "DROP 기준: ①모순(뒤에서 사용자가 명시적으로 뒤집은 앞 진술) ②레거시(현재 방향 dibang-sui=Sui 온체인 신뢰네트워크와 단절되어 폐기된 옛 구현 맥락. 단 '왜 그 방향이 됐는지' 의도 흐름을 보이면 유지) ③무연결(의도와 무관한 일회성 기계 잡음: 순수 도구 plumbing, 무의미한 확인). "
        "KEEP 원칙: USER(★)는 의도의 핵심—거의 전부 보존. 의심되면 무조건 KEEP. drop은 확신할 때만. 보수적으로."),
       units_js)

out = os.path.join(ROOT, "_TASKS", "scripts", "p3_workflow.js")
open(out, "w", encoding="utf-8").write(js)
print("wrote", out, "units=", len(units))
