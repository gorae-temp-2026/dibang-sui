#!/usr/bin/env python3
"""P3.V — 3차 추출 전수 검증.
1) 커버리지: 모든 비어있지 않은 파일에 pass3 존재(빈 파일은 빈 pass3 생성).
2) cut-only: pass3 모든 블록이 pass2 블록집합에 그대로 존재(subset).
3) USER 의도 보존: pass2 대비 pass3의 USER(★) 블록 보존율(과도 삭제 감지).
"""
import os, sys, json, csv
from collections import Counter

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"
sys.path.insert(0, os.path.join(ROOT, "_TASKS", "scripts"))
from extract_pass1 import render_md

def load(p):
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()] if os.path.exists(p) else []

rows = list(csv.DictReader(open(os.path.join(ROOT, "_manifest", "source-manifest.tsv")), delimiter="\t"))
out = os.path.join(ROOT, "_TASKS", "ledger", "phase3-verify.tsv")

bad_subset = missing = 0
tot_user2 = tot_user3 = tot2 = tot3 = 0
empty_made = 0
with open(out, "w") as vf:
    vf.write("code\tbase\tpass2_blocks\tpass3_blocks\tuser2\tuser3\tsubset_ok\tstatus\n")
    for r in rows:
        code, base = r["code"], r["file"][:-6]
        p2 = os.path.join(ROOT, "02-extract-pass2", code, base + ".md.blocks.jsonl")
        p3 = os.path.join(ROOT, "03-extract-pass3", code, base + ".md.blocks.jsonl")
        b2 = load(p2)
        if not b2:
            # 빈 파일: 빈 pass3 보장
            if not os.path.exists(p3):
                op = os.path.join(ROOT, "03-extract-pass3", code, base + ".md")
                os.makedirs(os.path.dirname(op), exist_ok=True)
                render_md([], op); open(op + ".blocks.jsonl", "w").close()
                empty_made += 1
            vf.write(f"{code}\t{base}\t0\t0\t0\t0\t1\tNA_empty\n"); continue
        if not os.path.exists(p3):
            missing += 1
            vf.write(f"{code}\t{base}\t{len(b2)}\t-\t-\t-\t-\tMISSING\n"); continue
        b3 = load(p3)
        pool = Counter((b["k"], b.get("name", ""), b["t"]) for b in b2)
        c3 = Counter((b["k"], b.get("name", ""), b["t"]) for b in b3)
        subset_ok = all(pool[k] >= n for k, n in c3.items())
        if not subset_ok: bad_subset += 1
        u2 = sum(1 for b in b2 if b["k"] == "USER")
        u3 = sum(1 for b in b3 if b["k"] == "USER")
        tot_user2 += u2; tot_user3 += u3; tot2 += len(b2); tot3 += len(b3)
        st = "OK" if subset_ok else "SUBSET_FAIL"
        vf.write(f"{code}\t{base}\t{len(b2)}\t{len(b3)}\t{u2}\t{u3}\t{int(subset_ok)}\t{st}\n")

print(json.dumps(dict(
    missing=missing, subset_fail=bad_subset, empty_pass3_made=empty_made,
    pass2_blocks=tot2, pass3_blocks=tot3,
    overall_drop_pct=round(100*(tot2-tot3)/tot2, 1) if tot2 else 0,
    user_blocks_pass2=tot_user2, user_blocks_pass3=tot_user3,
    user_retention_pct=round(100*tot_user3/tot_user2, 1) if tot_user2 else 0), ensure_ascii=False))
print("PASS" if (missing == 0 and bad_subset == 0) else "FAIL")
