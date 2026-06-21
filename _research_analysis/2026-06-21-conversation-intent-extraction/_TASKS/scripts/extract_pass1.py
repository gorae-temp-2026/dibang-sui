#!/usr/bin/env python3
"""P1 — 1차 추출기 (결정적 · cut-only · 해석/압축 없음).

규칙(00-INTENT-CHARTER §2-1): 남기는 텍스트는 원문 필드를 그대로 복사하거나,
거대 blob의 머리/꼬리만 남기고 잘라낸 것뿐. paraphrase/요약/재배열 없음.
- 메인만: isSidechain=true 레코드는 건너뜀.
- 남김: 사람 user 발화 / assistant text / tool_use(이름+인자) / tool_result(머리꼬리)
- 버림(=cut, 단 읽기는 함): thinking, attachment/snapshot/mode 등 메타레코드, 이미지/base64
원문 전체를 한 줄도 빠짐없이 '읽는다'(700MB 전량 read = 목표).

출력:
  <out>.md            사람이 읽는 렌더본
  <out>.blocks.jsonl  구조화 블록(다운스트림 단계가 모호성 없이 처리)  {"k","t","name"}
  <out>.stats.json    통계

usage: extract_pass1.py <in.jsonl> <out.md> [start_line] [end_line]
"""
import os, sys, json

IN_LIM, IN_H, IN_T = 3000, 2000, 600      # tool_use input 절단
RES_LIM, RES_H, RES_T = 2000, 1200, 600   # tool_result 절단
CUT = "…[%d chars cut]…"

HDRS = {"USER": "### USER  ★", "USERMETA": "### USER (meta/injected)",
        "ASSISTANT": "### ASSISTANT", "RESULT": "### RESULT"}

def trim(s, lim, h, t):
    if s is None: return "", 0
    if len(s) <= lim: return s, 0
    cut = len(s) - h - t
    return s[:h] + "\n" + (CUT % cut) + "\n" + s[len(s)-t:], cut

def result_text(content):
    if content is None: return ""
    if isinstance(content, str): return content
    if isinstance(content, list):
        parts = []
        for b in content:
            if isinstance(b, dict):
                if b.get("type") == "text": parts.append(b.get("text", ""))
                elif b.get("type") == "image": parts.append("[image omitted]")
                else: parts.append("")
            elif isinstance(b, str): parts.append(b)
        return "\n".join(parts)
    return json.dumps(content, ensure_ascii=False)

def extract_file(inp, out, start=None, end=None):
    blocks = []  # {"k","t","name"?}
    st = dict(src_lines=0, read_lines=0, user=0, user_meta=0, assistant=0,
              tool=0, result=0, drop_thinking=0, drop_meta_rec=0,
              drop_sidechain=0, blob_cut_chars=0, parse_err=0)
    with open(inp, encoding="utf-8") as fh:
        for i, raw in enumerate(fh):
            st["src_lines"] += 1
            if start is not None and i < start: continue
            if end is not None and i >= end: break
            st["read_lines"] += 1
            raw = raw.strip()
            if not raw: continue
            try: o = json.loads(raw)
            except Exception: st["parse_err"] += 1; continue
            if o.get("isSidechain") is True: st["drop_sidechain"] += 1; continue
            t = o.get("type"); msg = o.get("message")
            if t == "user" and isinstance(msg, dict):
                c = msg.get("content")
                if isinstance(c, str):
                    if o.get("isMeta") is True:
                        st["user_meta"] += 1; blocks.append({"k": "USERMETA", "t": c})
                    else:
                        st["user"] += 1; blocks.append({"k": "USER", "t": c})
                elif isinstance(c, list):
                    for b in c:
                        if not isinstance(b, dict): continue
                        if b.get("type") == "text":
                            st["user"] += 1; blocks.append({"k": "USER", "t": b.get("text", "")})
                        elif b.get("type") == "tool_result":
                            st["result"] += 1
                            tr, cut = trim(result_text(b.get("content")), RES_LIM, RES_H, RES_T)
                            st["blob_cut_chars"] += cut
                            blocks.append({"k": "RESULT", "t": tr})
            elif t == "assistant" and isinstance(msg, dict):
                c = msg.get("content")
                if isinstance(c, list):
                    for b in c:
                        if not isinstance(b, dict): continue
                        bt = b.get("type")
                        if bt == "text":
                            st["assistant"] += 1; blocks.append({"k": "ASSISTANT", "t": b.get("text", "")})
                        elif bt == "tool_use":
                            st["tool"] += 1
                            tr, cut = trim(json.dumps(b.get("input", {}), ensure_ascii=False), IN_LIM, IN_H, IN_T)
                            st["blob_cut_chars"] += cut
                            blocks.append({"k": "TOOL", "name": b.get("name", "?"), "t": tr})
                        elif bt == "thinking":
                            st["drop_thinking"] += 1
                elif isinstance(c, str):
                    st["assistant"] += 1; blocks.append({"k": "ASSISTANT", "t": c})
            else:
                st["drop_meta_rec"] += 1

    os.makedirs(os.path.dirname(out), exist_ok=True)
    render_md(blocks, out)
    with open(out + ".blocks.jsonl", "w", encoding="utf-8") as f:
        for b in blocks:
            f.write(json.dumps(b, ensure_ascii=False) + "\n")
    st["out_blocks"] = len(blocks)
    with open(out + ".stats.json", "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False, indent=2)
    return st

def render_md(blocks, out):
    lines = []
    for b in blocks:
        if b["k"] == "TOOL":
            lines.append("### TOOL: " + b.get("name", "?"))
        else:
            lines.append(HDRS[b["k"]])
        lines.append(b["t"]); lines.append("")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def main():
    inp, out = sys.argv[1], sys.argv[2]
    start = int(sys.argv[3]) if len(sys.argv) > 3 else None
    end = int(sys.argv[4]) if len(sys.argv) > 4 else None
    print(json.dumps(extract_file(inp, out, start, end), ensure_ascii=False))

if __name__ == "__main__":
    main()
