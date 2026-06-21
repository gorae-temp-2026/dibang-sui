#!/usr/bin/env python3
"""P2.V — 2차 추출 검증.
1) cut-only/부분집합: pass2 모든 블록이 pass1 블록집합에 그대로 존재(텍스트 미변형).
2) 잔존율(문자): 파일별·전체 ≥50%.
"""
import os, sys, json, csv
from collections import Counter

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"

def load(p):
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]

def key(b):
    return (b["k"], b.get("name", ""), b["t"])

man = os.path.join(ROOT, "_manifest", "source-manifest.tsv")
rows = list(csv.DictReader(open(man), delimiter="\t"))
out = os.path.join(ROOT, "_TASKS", "ledger", "phase2-verify.tsv")

bad_subset = below = 0
tot_in = tot_out = 0
with open(out, "w") as vf:
    vf.write("code\tfile\tsubset_ok\tretain_pct\tstatus\n")
    for row in rows:
        code, fn = row["code"], row["file"]
        base = fn[:-6]
        p1 = os.path.join(ROOT, "01-extract-pass1", code, base + ".md.blocks.jsonl")
        p2 = os.path.join(ROOT, "02-extract-pass2", code, base + ".md.blocks.jsonl")
        b1, b2 = load(p1), load(p2)
        pool = Counter(key(b) for b in b1)
        sub_ok = True
        c2 = Counter(key(b) for b in b2)
        for k, n in c2.items():
            if pool[k] < n: sub_ok = False; break
        ic = sum(len(b["t"]) for b in b1)
        oc = sum(len(b["t"]) for b in b2)
        pct = 100.0 * oc / ic if ic else 100.0   # 내용 0이면 N/A=OK(보존할 것 없음)
        tot_in += ic; tot_out += oc
        st = "OK"
        if not sub_ok: st = "SUBSET_FAIL"; bad_subset += 1
        elif ic and pct < 50: st = "BELOW50"; below += 1
        elif not ic: st = "NA_empty"
        vf.write(f"{code}\t{fn}\t{int(sub_ok)}\t{pct:.1f}\t{st}\n")

print(json.dumps(dict(files=len(rows), subset_fail=bad_subset, below50=below,
                      overall_retain=round(100.0*tot_out/tot_in, 1)), ensure_ascii=False))
print("PASS" if (bad_subset == 0 and below == 0) else "FAIL")
