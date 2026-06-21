#!/usr/bin/env python3
"""P3 인스턴스 생성기 — 세션을 청크(<=CHUNK_CHARS)로 쪼개 서브에이전트 유닛 생성.
각 유닛 = pass2 블록의 연속 구간. 슬라이스 파일을 미리 써서 서브에이전트가 그 파일만 읽게 함.
출력:
  _TASKS/instances/phase3-tasks.tsv          (유닛 목록 + status)
  _TASKS/instances/p3-chunks/<code>__<base>__u<idx>.blocks.jsonl  (슬라이스, 로컬 0-base)
"""
import os, json, csv

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"
CHUNK_CHARS = 250000

man = os.path.join(ROOT, "_manifest", "source-manifest.tsv")
rows = list(csv.DictReader(open(man), delimiter="\t"))
chunkdir = os.path.join(ROOT, "_TASKS", "instances", "p3-chunks")
os.makedirs(chunkdir, exist_ok=True)
inst = os.path.join(ROOT, "_TASKS", "instances", "phase3-tasks.tsv")

units = []
for row in rows:
    code, base = row["code"], row["file"][:-6]
    p2 = os.path.join(ROOT, "02-extract-pass2", code, base + ".md.blocks.jsonl")
    if not os.path.exists(p2):
        continue
    blocks = [json.loads(l) for l in open(p2, encoding="utf-8") if l.strip()]
    if not blocks:
        continue
    # 청크 분할(블록 경계 유지)
    cur, cur_chars, start, uidx = [], 0, 0, 0
    def flush(cur, start, uidx):
        sl = os.path.join(chunkdir, f"{code}__{base}__u{uidx}.blocks.jsonl")
        with open(sl, "w", encoding="utf-8") as f:
            for b in cur: f.write(json.dumps(b, ensure_ascii=False) + "\n")
        units.append((code, base, uidx, start, start + len(cur), len(cur), sl))
    for i, b in enumerate(blocks):
        cur.append(b); cur_chars += len(b.get("t", ""))
        if cur_chars >= CHUNK_CHARS:
            flush(cur, start, uidx)
            uidx += 1; start = i + 1; cur, cur_chars = [], 0
    if cur:
        flush(cur, start, uidx)

with open(inst, "w") as f:
    f.write("unit_id\tcode\tbase\tunit_idx\tblock_start\tblock_end\tn_blocks\tslice\tstatus\n")
    for u in units:
        uid = f"P3.{u[0]}.{u[1][:8]}.u{u[2]}"
        f.write(f"{uid}\t{u[0]}\t{u[1]}\t{u[2]}\t{u[3]}\t{u[4]}\t{u[5]}\t{u[6]}\tpending\n")

from collections import Counter
bycode = Counter(u[0] for u in units)
print(f"P3 유닛 총 {len(units)}개 -> {inst}")
print("code별:", dict(bycode))
multi = Counter(u[0] for u in units if u[2] > 0)
print(f"청크>1 유닛(대형 세션 조각): {sum(1 for u in units if u[2]>0)}")
