#!/usr/bin/env python3
"""P0.2 — SOURCE 매니페스트 생성.
대상 6개 트랜스크립트 폴더의 최상위 *.jsonl(메인 대화)만 열거.
출력: _manifest/source-manifest.tsv
컬럼: code  dir  file  bytes  lines  size_class  chunk_needed  chunk_count
규칙(헌장 §0-2): bytes>8MB 또는 lines>2500 이면 청크 필요, 청크크기 2000줄.
"""
import os, sys, math, json

PROJ = "/Users/taewonpark/.claude/projects"
ROOT = "/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui/_research_analysis/2026-06-21-conversation-intent-extraction"

# code -> transcript dir name
SOURCES = {
    "A": "-Users-taewonpark-Github-WORK-GoraeUniverse-dibang-sui",
    "B": "-Users-taewonpark-Github-WORK-GoraeUniverse-dibang-sui-worktrees-feat-integrate-sui-dibang-inyeon",
    "C": "-Users-taewonpark-Github-WORK-GoraeUniverse-digital-guestbook-v3",
    "D": "-Users-taewonpark-Github-WORK-GoraeUniverse-digital-guestbook-v3--claude-worktrees-fix-guest-web-origin-env",
    "E": "-Users-taewonpark-Github-WORK-GoraeUniverse-digital-guestbook-v3--claude-worktrees-invitation-design-config",
    "F": "-Users-taewonpark-Github-WORK-GoraeUniverse-digital-guestbook-v3--claude-worktrees-lounge-check-in-rename",
}
CHUNK_LINES = 2000
BIG_BYTES = 8 * 1024 * 1024
BIG_LINES = 2500

def size_class(b):
    if b < 50*1024: return "tiny"
    if b < 500*1024: return "small"
    if b < 3*1024*1024: return "med"
    if b < BIG_BYTES: return "large"
    return "huge"

def count_lines(path):
    n = 0
    with open(path, "rb") as f:
        for _ in f: n += 1
    return n

rows = []
for code, d in SOURCES.items():
    full = os.path.join(PROJ, d)
    if not os.path.isdir(full):
        continue
    for name in sorted(os.listdir(full)):
        if not name.endswith(".jsonl"):
            continue
        p = os.path.join(full, name)
        if not os.path.isfile(p):
            continue
        b = os.path.getsize(p)
        ln = count_lines(p)
        chunk = b > BIG_BYTES or ln > BIG_LINES
        cc = math.ceil(ln / CHUNK_LINES) if chunk else 1
        rows.append((code, d, name, b, ln, size_class(b), int(chunk), cc))

os.makedirs(os.path.join(ROOT, "_manifest"), exist_ok=True)
out = os.path.join(ROOT, "_manifest", "source-manifest.tsv")
with open(out, "w") as f:
    f.write("code\tdir\tfile\tbytes\tlines\tsize_class\tchunk_needed\tchunk_count\n")
    for r in rows:
        f.write("\t".join(str(x) for x in r) + "\n")

# summary
tot_files = len(rows)
tot_bytes = sum(r[3] for r in rows)
tot_lines = sum(r[4] for r in rows)
chunk_files = sum(1 for r in rows if r[6])
chunk_tasks = sum(r[7] for r in rows if r[6])
by_code = {}
for r in rows:
    c = r[0]; by_code.setdefault(c, [0,0]); by_code[c][0]+=1; by_code[c][1]+=r[3]
print(f"manifest -> {out}")
print(f"files={tot_files}  bytes={tot_bytes/1024/1024:.1f}MB  lines={tot_lines}")
print(f"chunk_files={chunk_files}  total_chunk_tasks={chunk_tasks}")
for c in sorted(by_code):
    print(f"  {c}: {by_code[c][0]} files, {by_code[c][1]/1024/1024:.1f}MB")
