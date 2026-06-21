#!/usr/bin/env python3
"""P3 재구성·검증 — 서브에이전트 drop 결정으로 pass3를 중앙에서 cut-only 생성.

결정 파일: _TASKS/instances/p3-decisions/<code>__<base>__u<idx>.json
  {"code","base","unit_idx","block_start","n_blocks","drop_local":[...]}
- drop_local은 [0,n_blocks)로 클램프된 상태로 저장됨(범위 밖 무시).
- 파일의 모든 유닛이 처리된 경우에만 pass3 확정(부분 처리 파일은 보류).
출력: 03-extract-pass3/<code>/<base>.md + .blocks.jsonl
검증: pass3 블록 전부 pass2 블록집합에 그대로 존재(cut-only).
"""
import os, sys, json, glob, csv, re
from collections import defaultdict, Counter

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"
sys.path.insert(0, os.path.join(ROOT, "_TASKS", "scripts"))
from extract_pass1 import render_md

DEC = os.path.join(ROOT, "_TASKS", "instances", "p3-decisions")

# USER 보호: 진짜 사용자 발화는 에이전트가 drop해도 중앙에서 강제 보존.
# 아래 plumbing(시스템 주입/커맨드/인터럽트 등)만 USER drop 허용.
_PLUMB = re.compile(
    r"^<command-name>|command-message|local-command-stdout|"
    r"\[Request interrupted by user\]|"
    r"^Another Claude session sent a message:|^<teammate-message|"
    r"^Base directory for this skill:|^<bash-input>|"
    r"^Caveat: The messages below|No response requested|"
    r"^\s*(resume|continue)\s*$", re.IGNORECASE)

def is_user_plumbing(t):
    s = (t or "").strip()
    if not s: return True
    if _PLUMB.search(s): return True
    # 순수 토큰 덤프(JWT/base64 한 덩어리, 공백 없음)도 plumbing 취급
    if len(s) > 80 and " " not in s and "\n" not in s and re.match(r"^[A-Za-z0-9._\-]+$", s):
        return True
    return False

def load(p):
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]

# 파일별 기대 유닛 수
inst = os.path.join(ROOT, "_TASKS", "instances", "phase3-tasks.tsv")
expected = Counter()
for r in csv.DictReader(open(inst), delimiter="\t"):
    expected[(r["code"], r["base"])] += 1

# 결정 모으기
gdrop = defaultdict(set)
done_units = defaultdict(set)
for d in sorted(glob.glob(os.path.join(DEC, "*.json"))):
    o = json.load(open(d, encoding="utf-8"))
    key = (o["code"], o["base"])
    start = o.get("block_start", 0)
    nb = o.get("n_blocks", 10**9)
    done_units[key].add(o.get("unit_idx", 0))
    for loc in o.get("drop_local", []):
        loc = int(loc)
        if 0 <= loc < nb:           # 클램프: 유닛 범위 안만
            gdrop[key].add(start + loc)

ledg = os.path.join(ROOT, "_TASKS", "ledger", "phase3-ledger.tsv")
complete = partial = bad = 0
tot_in = tot_kept = 0
with open(ledg, "w") as lf:
    lf.write("code\tbase\tunits_done\tunits_expected\tin_blocks\tkept\tdropped\tsubset_ok\tstatus\n")
    for key in sorted(done_units):
        code, base = key
        ud, ue = len(done_units[key]), expected[key]
        if ud < ue:
            partial += 1
            lf.write(f"{code}\t{base}\t{ud}\t{ue}\t-\t-\t-\t-\tPARTIAL\n")
            continue
        p2 = os.path.join(ROOT, "02-extract-pass2", code, base + ".md.blocks.jsonl")
        b2 = load(p2)
        pool = Counter((b["k"], b.get("name", ""), b["t"]) for b in b2)
        # USER 보호: drop 대상이라도 진짜 USER 발화면 강제 보존
        protected = {i for i in gdrop[key]
                     if i < len(b2) and b2[i]["k"] == "USER" and not is_user_plumbing(b2[i]["t"])}
        eff_drop = gdrop[key] - protected
        kept = [b for i, b in enumerate(b2) if i not in eff_drop]
        ck = Counter((b["k"], b.get("name", ""), b["t"]) for b in kept)
        subset_ok = all(pool[k] >= n for k, n in ck.items())
        if not subset_ok: bad += 1
        out = os.path.join(ROOT, "03-extract-pass3", code, base + ".md")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        render_md(kept, out)
        with open(out + ".blocks.jsonl", "w", encoding="utf-8") as bf:
            for b in kept: bf.write(json.dumps(b, ensure_ascii=False) + "\n")
        complete += 1; tot_in += len(b2); tot_kept += len(kept)
        lf.write(f"{code}\t{base}\t{ud}\t{ue}\t{len(b2)}\t{len(kept)}\t{len(b2)-len(kept)}\t{int(subset_ok)}\tDONE\n")

print(json.dumps(dict(complete_files=complete, partial_files=partial, subset_fail=bad,
                      in_blocks=tot_in, kept_blocks=tot_kept,
                      drop_rate_pct=round(100*(tot_in-tot_kept)/tot_in, 1) if tot_in else 0),
                 ensure_ascii=False))
print(f"pass3 확정 {complete}/160 (부분처리 보류 {partial})")
