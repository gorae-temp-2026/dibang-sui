#!/usr/bin/env python3
"""P2 구동기 — 2차 추출 (cut-only, 보수적 노이즈 제거, ≥50% 잔존).

블록(pass1.blocks.jsonl)에서 '진짜 진짜 필요 없는' 블록만 삭제. 텍스트 변형 없음(cut-only).
- DROP: USERMETA(주입 리마인더), 고신뢰 노이즈 RESULT.
- KEEP: USER / ASSISTANT / TOOL 전량 (의도 핵심), 의미 있는 RESULT.
출력: 02-extract-pass2/<code>/<base>.md + .blocks.jsonl
검증: 잔존율(문자수) ≥50%, 블록 텍스트 미변형(부분집합).
"""
import os, sys, json, csv, re

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"
sys.path.insert(0, os.path.join(ROOT, "_TASKS", "scripts"))
from extract_pass1 import render_md

NOISE_PREFIX = (
    "File created successfully at:",
    "The file ",                       # "...has been updated successfully"
    "<system-reminder>",
    "<functions>",
    "Tool ran without output",
    "Applied ", "Successfully wrote",
)
NOISE_EXACT = {"No tasks found", "(no content)", "", "OK", "(eval):"}

def is_noise_result(t):
    s = (t or "").strip()
    if not s: return True
    if s in NOISE_EXACT: return True
    if s.startswith("File content (") and "exceeds maximum" in s: return True
    if s.startswith("The file ") and "has been updated successfully" in s: return True
    for p in NOISE_PREFIX:
        if s.startswith(p): return True
    return False

def filter_blocks(blocks, min_ratio=0.5):
    """노이즈 제거 후, 파일별 잔존율 < min_ratio 이면 제거 블록을 큰 것부터
    되살려 floor 충족(원래 순서 보존). cut-only 유지(텍스트 변형 없음)."""
    total = sum(len(b.get("t", "")) for b in blocks) or 1
    drop_idx = set()
    cnt = dict(usermeta=0, noise_result=0, restored=0)
    for i, b in enumerate(blocks):
        if b["k"] == "USERMETA":
            drop_idx.add(i); cnt["usermeta"] += 1
        elif b["k"] == "RESULT" and is_noise_result(b["t"]):
            drop_idx.add(i); cnt["noise_result"] += 1
    kept_chars = total - sum(len(blocks[i].get("t", "")) for i in drop_idx)
    if kept_chars / total < min_ratio:
        # 큰 제거블록부터 복원
        for i in sorted(drop_idx, key=lambda j: len(blocks[j].get("t", "")), reverse=True):
            if kept_chars / total >= min_ratio: break
            drop_idx.discard(i); cnt["restored"] += 1
            kept_chars += len(blocks[i].get("t", ""))
    kept = [b for i, b in enumerate(blocks) if i not in drop_idx]
    return kept, cnt

def chars(blocks):
    return sum(len(b.get("t", "")) for b in blocks)

def main():
    man = os.path.join(ROOT, "_manifest", "source-manifest.tsv")
    with open(man) as f:
        rows = list(csv.DictReader(f, delimiter="\t"))
    ledg = os.path.join(ROOT, "_TASKS", "ledger", "phase2-ledger.tsv")
    inst = os.path.join(ROOT, "_TASKS", "instances", "phase2-tasks.tsv")
    with open(inst, "w") as f:
        f.write("unit_id\tcode\tsrc_file\tstatus\n")
        for i, row in enumerate(rows, 1):
            f.write(f"P2.EX.{i:03d}\t{row['code']}\t{row['file']}\tpending\n")

    agg = dict(in_blocks=0, out_blocks=0, in_chars=0, out_chars=0,
               drop_usermeta=0, drop_noise_result=0)
    below = []
    with open(ledg, "w") as lf:
        lf.write("unit_id\tcode\tfile\tin_blocks\tout_blocks\tin_chars\tout_chars\tretain_pct\tstatus\n")
        for i, row in enumerate(rows, 1):
            code, fn = row["code"], row["file"]
            base = fn[:-6]
            p1 = os.path.join(ROOT, "01-extract-pass1", code, base + ".md.blocks.jsonl")
            blocks = [json.loads(l) for l in open(p1, encoding="utf-8") if l.strip()]
            kept, dropped = filter_blocks(blocks)
            ic, oc = chars(blocks), chars(kept)
            out = os.path.join(ROOT, "02-extract-pass2", code, base + ".md")
            os.makedirs(os.path.dirname(out), exist_ok=True)
            render_md(kept, out)
            with open(out + ".blocks.jsonl", "w", encoding="utf-8") as bf:
                for b in kept: bf.write(json.dumps(b, ensure_ascii=False) + "\n")
            pct = (100.0 * oc / ic) if ic else 100.0
            if pct < 50: below.append((fn, round(pct, 1)))
            agg["in_blocks"] += len(blocks); agg["out_blocks"] += len(kept)
            agg["in_chars"] += ic; agg["out_chars"] += oc
            agg["drop_usermeta"] += dropped["usermeta"]; agg["drop_noise_result"] += dropped["noise_result"]
            lf.write(f"P2.EX.{i:03d}\t{code}\t{fn}\t{len(blocks)}\t{len(kept)}\t{ic}\t{oc}\t{pct:.1f}\tdone\n")

    overall = 100.0 * agg["out_chars"] / agg["in_chars"] if agg["in_chars"] else 0
    print(json.dumps(agg, ensure_ascii=False))
    print(f"전체 잔존율(문자): {overall:.1f}%  (≥50% 이어야 함)")
    print(f"개별 50%미만 파일 수: {len(below)}")
    for fn, p in below[:15]: print(f"  {fn}: {p}%")

if __name__ == "__main__":
    main()
