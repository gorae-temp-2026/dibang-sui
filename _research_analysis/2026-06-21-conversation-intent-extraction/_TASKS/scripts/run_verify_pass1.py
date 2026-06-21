#!/usr/bin/env python3
"""P1.V — 1차 추출 전체 cut-only 검증 스윕.
모든 pass1 출력의 내용 라인이 원문 디코딩 텍스트의 부분문자열인지 확인.
출력: ledger/phase1-verify.tsv + 요약.
"""
import os, sys, json, csv

ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"
PROJ = "/Users/taewonpark/.claude/projects"
sys.path.insert(0, os.path.join(ROOT, "_TASKS", "scripts"))
from verify_cutonly import build_pool

man = os.path.join(ROOT, "_manifest", "source-manifest.tsv")
with open(man) as f:
    rows = list(csv.DictReader(f, delimiter="\t"))

out_tsv = os.path.join(ROOT, "_TASKS", "ledger", "phase1-verify.tsv")
tot_checked = tot_viol = files_viol = missing = 0
with open(out_tsv, "w") as vf:
    vf.write("code\tsrc_file\tchecked\tviolations\tstatus\n")
    for row in rows:
        code, fn = row["code"], row["file"]
        src = os.path.join(PROJ, row["dir"], fn)
        out = os.path.join(ROOT, "01-extract-pass1", code, fn[:-6] + ".md")
        if not os.path.exists(out):
            missing += 1
            vf.write(f"{code}\t{fn}\t0\t0\tMISSING\n"); continue
        blob = build_pool(src, None, None)
        checked = viol = 0
        bad = []
        with open(out, encoding="utf-8") as f:
            for ln, line in enumerate(f, 1):
                s = line.rstrip("\n")
                if not s.strip(): continue
                if s.startswith("### "): continue
                if "chars cut]…" in s: continue
                if s.strip() == "[image omitted]": continue
                checked += 1
                if s not in blob:
                    viol += 1
                    if len(bad) < 3: bad.append((ln, s[:80]))
        tot_checked += checked; tot_viol += viol
        status = "OK" if viol == 0 else "VIOL"
        if viol: files_viol += 1
        vf.write(f"{code}\t{fn}\t{checked}\t{viol}\t{status}\n")
        if viol:
            for ln, snip in bad:
                print(f"  {fn}:{ln} VIOL {snip!r}")

print(json.dumps(dict(files=len(rows), missing=missing,
                      total_checked=tot_checked, total_violations=tot_viol,
                      files_with_violation=files_viol), ensure_ascii=False))
print(f"verify ledger -> {out_tsv}")
