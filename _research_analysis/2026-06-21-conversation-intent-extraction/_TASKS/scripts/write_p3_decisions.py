#!/usr/bin/env python3
"""P3 결정 기록 헬퍼.
입력(JSONL, stdin): 각 줄 {"code","base","unit_idx","drop_local":[...]}
phase3-tasks.tsv에서 block_start·n_blocks 조회 → drop_local 클램프 → 결정 파일 기록.
phase3-tasks.tsv의 해당 유닛 status를 done으로 갱신.
"""
import os, sys, json, csv

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"
DEC = os.path.join(ROOT, "_TASKS", "instances", "p3-decisions")
INST = os.path.join(ROOT, "_TASKS", "instances", "phase3-tasks.tsv")
os.makedirs(DEC, exist_ok=True)

rows = list(csv.DictReader(open(INST), delimiter="\t"))
meta = {(r["code"], r["base"], int(r["unit_idx"])): r for r in rows}

written = 0
done_keys = set()
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    o = json.loads(line)
    code, base, uidx = o["code"], o["base"], int(o["unit_idx"])
    m = meta.get((code, base, uidx))
    if not m:
        print("WARN no meta for", code, base, uidx); continue
    nb = int(m["n_blocks"]); start = int(m["block_start"])
    clamped = sorted({int(x) for x in o.get("drop_local", []) if 0 <= int(x) < nb})
    dec = {"code": code, "base": base, "unit_idx": uidx,
           "block_start": start, "n_blocks": nb, "drop_local": clamped,
           "note": o.get("note", "")}
    p = os.path.join(DEC, f"{code}__{base}__u{uidx}.json")
    json.dump(dec, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    written += 1
    done_keys.add((code, base, uidx))

# status 갱신
for r in rows:
    if (r["code"], r["base"], int(r["unit_idx"])) in done_keys:
        r["status"] = "done"
with open(INST, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys(), delimiter="\t")
    w.writeheader(); w.writerows(rows)

print(f"결정 {written}개 기록")
