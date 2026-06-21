#!/usr/bin/env python3
"""cut-only 검증기 (1·2·3차 공통 골격, 여기선 pass1 vs 원문).

불변식: pass 출력의 모든 '내용 라인'은 원문에서 디코딩한 텍스트의 '연속 부분문자열'이어야 한다.
(해석/요약/패러프레이즈가 끼면 위반으로 잡힌다.)
- 헤더(### …), 절단 마커(…[N chars cut]…), 빈 줄, [image omitted]은 검증 제외.
- 원문 텍스트 풀: user content / assistant text / tool_use input(json) / tool_result text.

usage: verify_cutonly.py <source.jsonl> <pass.md> [start_line] [end_line]
exit 0 = 통과(위반 0), 1 = 위반 존재.
"""
import sys, json

def result_text(content):
    if content is None: return ""
    if isinstance(content, str): return content
    if isinstance(content, list):
        out = []
        for b in content:
            if isinstance(b, dict):
                if b.get("type") == "text": out.append(b.get("text", ""))
            elif isinstance(b, str): out.append(b)
        return "\n".join(out)
    return json.dumps(content, ensure_ascii=False)

def build_pool(src, start, end):
    pool = []
    with open(src, encoding="utf-8") as fh:
        for i, raw in enumerate(fh):
            if start is not None and i < start: continue
            if end is not None and i >= end: break
            raw = raw.strip()
            if not raw: continue
            try: o = json.loads(raw)
            except: continue
            if o.get("isSidechain") is True: continue
            msg = o.get("message")
            if not isinstance(msg, dict): continue
            c = msg.get("content")
            if isinstance(c, str):
                pool.append(c)
            elif isinstance(c, list):
                for b in c:
                    if not isinstance(b, dict): continue
                    bt = b.get("type")
                    if bt == "text": pool.append(b.get("text", ""))
                    elif bt == "tool_use":
                        pool.append(json.dumps(b.get("input", {}), ensure_ascii=False))
                    elif bt == "tool_result":
                        pool.append(result_text(b.get("content")))
    return "\n\n".join(pool)   # 구분자로 합쳐 거대 blob

def main():
    src, passmd = sys.argv[1], sys.argv[2]
    start = int(sys.argv[3]) if len(sys.argv) > 3 else None
    end = int(sys.argv[4]) if len(sys.argv) > 4 else None
    blob = build_pool(src, start, end)
    viol, checked = [], 0
    with open(passmd, encoding="utf-8") as f:
        for ln, line in enumerate(f, 1):
            s = line.rstrip("\n")
            if not s.strip(): continue
            if s.startswith("### "): continue
            if "chars cut]…" in s: continue
            if s.strip() == "[image omitted]": continue
            checked += 1
            if s not in blob:
                viol.append((ln, s[:120]))
    print(json.dumps(dict(checked=checked, violations=len(viol)), ensure_ascii=False))
    if viol:
        for ln, snip in viol[:20]:
            print(f"  VIOLATION line {ln}: {snip!r}")
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
