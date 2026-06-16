#!/usr/bin/env python3
"""
d2-erd-from-postgres 출력(output.d2)에서 v3_ prefix 테이블만 추출하여
_architecture/diagram-db-schema.d2에 저장한다.

테이블은 도메인 모델 계층 순서로 정렬된다 (상위 개념이 상단).

기준 DB: 로컬 Supabase (OrbStack, 127.0.0.1:54322) — 마이그 파일 적용 후 즉시
스키마를 떠올 수 있는 빠른 소스. dev/prod는 운영 환경(개인 변경 흔적 가능)
이라 ERD 단일 진실원천으로는 부적합. 운영 규칙은
_code_convention/DB_MIGRATIONS.md 참조.

사용법:
  0. 로컬 Supabase 부팅 + 최신 마이그 적용:
     supabase start
     supabase db reset

  1. d2-erd-from-postgres로 전체 스키마 d2 생성:
     cd /Users/taewonpark/.nvm/versions/node/v22.21.0/lib/node_modules/d2-erd-from-postgres
     node index.js "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

  2. 이 스크립트로 v3_ 테이블만 추출:
     python3 scripts/generate-db-schema-d2.py

  3. SVG 렌더링:
     d2 _architecture/diagram-db-schema.d2 _architecture/diagram-db-schema.svg
"""

import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

INPUT_PATH = "/Users/taewonpark/.nvm/versions/node/v22.21.0/lib/node_modules/d2-erd-from-postgres/output.d2"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "_architecture", "diagram-db-schema.d2")
SVG_PATH = os.path.join(os.path.dirname(__file__), "..", "_architecture", "diagram-db-schema.svg")
PREFIX = "v3_"

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")


def render_svg(d2_path: str, svg_path: str) -> None:
    subprocess.run(["d2", d2_path, svg_path], check=True)


def _force_fill(elem, color: str) -> None:
    """d2 svg 내장 CSS (.fill-N1 등)가 fill 속성을 override하므로 inline style로 강제."""
    existing = elem.get("style", "")
    if "fill:" in existing:
        new = re.sub(r"fill\s*:\s*[^;]+;?", f"fill:{color};", existing)
    else:
        new = f"fill:{color};{existing}" if existing else f"fill:{color}"
    elem.set("style", new)


def _add_header_underline(parent, header_rect) -> None:
    """헤더 rect 바닥에 검정 horizontal line 추가 (헤더-본문 시각 경계 복원)."""
    try:
        rx = float(header_rect.get("x", "0"))
        rw = float(header_rect.get("width", "0"))
        ry = float(header_rect.get("y", "0"))
        rh = float(header_rect.get("height", "0"))
    except ValueError:
        return
    line = ET.SubElement(parent, f"{{{SVG_NS}}}line")
    line.set("x1", str(rx))
    line.set("x2", str(rx + rw))
    line.set("y1", str(ry + rh))
    line.set("y2", str(ry + rh))
    line.set("stroke", "#0A0F25")
    line.set("style", "stroke:#0A0F25;stroke-width:2")


def post_process_svg(svg_path: str) -> tuple[int, int]:
    """sql_table 헤더 색 후처리 (inline style 강제):
    - class_header rect → 흰색, 같은 y 범위 text → 원래 헤더 색
    - class 없는 검정 rect (fill="black"/"#0A0F25") → 흰색 + 같은 y 범위 text 검정
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()
    rect_tag = f"{{{SVG_NS}}}rect"
    text_tag = f"{{{SVG_NS}}}text"
    g_tag = f"{{{SVG_NS}}}g"
    parent_map = {c: p for p in root.iter() for c in p}

    sql_changed = 0
    for rect in root.iter(rect_tag):
        cls = rect.get("class", "")
        if "class_header" not in cls:
            continue
        parent = parent_map.get(rect)
        while parent is not None and parent.tag != g_tag:
            parent = parent_map.get(parent)
        if parent is None:
            continue
        original_fill = rect.get("fill", "#000000")
        _force_fill(rect, "#FFFFFF")
        try:
            hy = float(rect.get("y", "0"))
            hh = float(rect.get("height", "0"))
        except ValueError:
            continue
        for text in parent.iter(text_tag):
            try:
                ty = float(text.get("y", "0"))
            except ValueError:
                continue
            if hy <= ty <= hy + hh:
                _force_fill(text, original_fill)
        _add_header_underline(parent, rect)
        sql_changed += 1

    extra_changed = 0
    for rect in root.iter(rect_tag):
        if rect.get("class") is not None:
            continue
        fill = (rect.get("fill") or "").lower()
        if fill not in ("black", "#000000", "#0a0f25"):
            continue
        _force_fill(rect, "#FFFFFF")
        parent = parent_map.get(rect)
        while parent is not None and parent.tag != g_tag:
            parent = parent_map.get(parent)
        if parent is None:
            extra_changed += 1
            continue
        try:
            ry = float(rect.get("y", "0"))
            rh = float(rect.get("height", "0"))
        except ValueError:
            extra_changed += 1
            continue
        for text in parent.iter(text_tag):
            try:
                ty = float(text.get("y", "0"))
            except ValueError:
                continue
            if ry <= ty <= ry + rh:
                _force_fill(text, "#000000")
        _add_header_underline(parent, rect)
        extra_changed += 1

    tree.write(svg_path, xml_declaration=True, encoding="utf-8")
    return sql_changed, extra_changed

# 도메인 모델 계층 순서 (상위 개념 → 하위 개념)
# 이 순서대로 d2 파일에 배치되어 상단에 상위 개념이 렌더링됨
TABLE_ORDER = [
    "v3_users",
    "v3_mois",
    "v3_moi_items",
    "v3_weddings",
    "v3_wedding_lounges",
    "v3_moi_gather_places",
    "v3_mobile_invitations",
    "v3_lounge_entries",
    "v3_guestbook_entries",
    "v3_host_announcements",
    "v3_interior_items",
    "v3_iums",
]


def extract_v3_blocks(content: str) -> dict[str, str]:
    """v3_ 테이블 블록을 추출하여 {테이블명: 블록 텍스트} 딕셔너리로 반환."""
    lines = content.split("\n")
    blocks = {}
    current_table = None
    current_lines = []
    inside_block = False
    brace_depth = 0

    i = 0
    while i < len(lines):
        line = lines[i]

        # v3_ 테이블 정의 시작
        if line.startswith(PREFIX) and "{" in line:
            table_name = line.split(":")[0].strip()
            inside_block = True
            brace_depth = 1
            current_table = table_name
            current_lines = [line]
            i += 1
            continue

        # 블록 내부 수집
        if inside_block:
            current_lines.append(line)
            brace_depth += line.count("{") - line.count("}")
            if brace_depth <= 0:
                inside_block = False
                blocks[current_table] = "\n".join(current_lines)
                current_table = None
                current_lines = []
            i += 1
            continue

        i += 1

    return blocks


def extract_fk_lines(content: str) -> dict[str, list[str]]:
    """v3_ FK 관계 라인을 {테이블명: [FK 라인들]} 딕셔너리로 반환."""
    fk_map: dict[str, list[str]] = {}
    for line in content.split("\n"):
        if line.startswith(PREFIX) and "->" in line:
            table_name = line.split(".")[0].strip()
            if table_name not in fk_map:
                fk_map[table_name] = []
            fk_map[table_name].append(line)
    return fk_map


def build_ordered_output(blocks: dict[str, str], fk_map: dict[str, list[str]]) -> str:
    """TABLE_ORDER 순서로 블록과 FK 라인을 조합하여 최종 d2 텍스트 생성."""
    output_parts = ["direction: up", ""]

    # 1. 정렬 순서에 있는 테이블
    for table in TABLE_ORDER:
        if table in blocks:
            output_parts.append(blocks[table])
            if table in fk_map:
                output_parts.extend(fk_map[table])
            output_parts.append("")

    # 2. TABLE_ORDER에 없는 새 테이블 (추후 추가될 수 있음)
    for table in sorted(blocks.keys()):
        if table not in TABLE_ORDER:
            output_parts.append(blocks[table])
            if table in fk_map:
                output_parts.extend(fk_map[table])
            output_parts.append("")

    return "\n".join(output_parts) + "\n"


def main():
    if not os.path.exists(INPUT_PATH):
        print(f"ERROR: {INPUT_PATH} 파일이 없습니다.")
        print("먼저 d2-erd-from-postgres를 실행하세요:")
        print('  cd /Users/taewonpark/.nvm/versions/node/v22.21.0/lib/node_modules/d2-erd-from-postgres')
        print('  node index.js "postgresql://postgres:postgres@127.0.0.1:54322/postgres"')
        sys.exit(1)

    with open(INPUT_PATH) as f:
        content = f.read()

    blocks = extract_v3_blocks(content)
    fk_map = extract_fk_lines(content)
    output = build_ordered_output(blocks, fk_map)
    output_path = os.path.abspath(OUTPUT_PATH)

    with open(output_path, "w") as f:
        f.write(output)

    table_count = len(blocks)
    print(f"v3 테이블 {table_count}개 추출 완료 (도메인 계층 순서) → {output_path}")

    # d2 → svg 렌더 + 색 후처리 (d2 파일은 default 그대로 두고 svg만 수정)
    svg_path = os.path.abspath(SVG_PATH)
    render_svg(output_path, svg_path)
    sql_changed, extra_changed = post_process_svg(svg_path)
    print(f"svg 렌더 + 후처리 (sql_table 헤더 {sql_changed} + 추가 검정 rect {extra_changed}) → {svg_path}")


if __name__ == "__main__":
    main()
