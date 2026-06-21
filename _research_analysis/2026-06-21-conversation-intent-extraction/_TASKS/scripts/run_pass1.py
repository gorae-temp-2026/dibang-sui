#!/usr/bin/env python3
"""P1 구동기 — 매니페스트 기반 1차 추출 전체 실행.
1) instances/phase1-tasks.tsv 생성(세부 태스크 목록 = 파일당 1 유닛)
2) 각 파일 streaming 추출(거대파일도 전체 1패스, 청크 불필요)
3) ledger/phase1-ledger.tsv 에 유닛별 결과·통계 기록
원문 전량 read 보장(read_lines 합계 = 매니페스트 lines 합계).
"""
import os, sys, json, csv

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"
PROJ = "/Users/taewonpark/.claude/projects"
sys.path.insert(0, os.path.join(ROOT, "_TASKS", "scripts"))
from extract_pass1 import extract_file

man = os.path.join(ROOT, "_manifest", "source-manifest.tsv")
inst = os.path.join(ROOT, "_TASKS", "instances", "phase1-tasks.tsv")
ledg = os.path.join(ROOT, "_TASKS", "ledger", "phase1-ledger.tsv")

rows = []
with open(man) as f:
    r = csv.DictReader(f, delimiter="\t")
    rows = list(r)

# 1) 세부 태스크 목록 먼저 생성
with open(inst, "w") as f:
    f.write("unit_id\tcode\tsrc_file\tout_file\tstatus\n")
    for i, row in enumerate(rows, 1):
        base = row["file"][:-6]  # .jsonl 제거
        outrel = f"01-extract-pass1/{row['code']}/{base}.md"
        f.write(f"P1.EX.{i:03d}\t{row['code']}\t{row['file']}\t{outrel}\tpending\n")
print(f"instances -> {inst} ({len(rows)} units)")

# 2)+3) 추출 실행 + 원장
agg = dict(read_lines=0, user=0, user_meta=0, assistant=0, tool=0,
           result=0, drop_thinking=0, drop_meta_rec=0, drop_sidechain=0,
           blob_cut_chars=0, parse_err=0, out_lines=0)
fail = 0
with open(ledg, "w") as lf:
    lf.write("unit_id\tcode\tsrc_file\tread_lines\tuser\tassistant\ttool\tresult\tout_lines\tstatus\n")
    for i, row in enumerate(rows, 1):
        code, fn = row["code"], row["file"]
        src = os.path.join(PROJ, row["dir"], fn)
        base = fn[:-6]
        out = os.path.join(ROOT, "01-extract-pass1", code, base + ".md")
        try:
            st = extract_file(src, out)
            status = "done"
            for k in agg: agg[k] += st.get(k, 0)
        except Exception as e:
            status = f"FAIL:{e}"; fail += 1; st = {}
        lf.write(f"P1.EX.{i:03d}\t{code}\t{fn}\t{st.get('read_lines',0)}\t"
                 f"{st.get('user',0)}\t{st.get('assistant',0)}\t{st.get('tool',0)}\t"
                 f"{st.get('result',0)}\t{st.get('out_lines',0)}\t{status}\n")

print(f"ledger -> {ledg}")
print(json.dumps(agg, ensure_ascii=False))
print(f"units={len(rows)} fail={fail}")
print(f"read_lines_total={agg['read_lines']}  (manifest lines=195046 이어야 함)")
