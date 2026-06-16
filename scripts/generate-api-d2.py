#!/usr/bin/env python3
"""
api-contract.yaml → _architecture/diagram-api-contract.d2 생성 스크립트.

구조:
  [API Endpoints]           [Schemas]
    [태그 컨테이너]            [스키마 복사본 (고유 ID, label=원래 이름)]
      [엔드포인트] ─────────→  [하위 참조 스키마] 간 $ref 관계

  엔드포인트에서 Schemas로 REQUEST(빨강)/RESPONSE(파랑) 화살표.
  Schemas 내부에서 스키마 복사본 → 하위 스키마 $ref 연결.

사용법:
  python3 scripts/generate-api-d2.py
  d2 _architecture/diagram-api-contract.d2 _architecture/diagram-api-contract.svg
"""

import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML이 필요합니다. pip install pyyaml")
    sys.exit(1)

SPEC_PATH = os.path.join(os.path.dirname(__file__), "..", "packages", "contracts", "api-contract.yaml")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "_architecture", "diagram-api-contract.d2")
SVG_PATH = os.path.join(os.path.dirname(__file__), "..", "_architecture", "diagram-api-contract.svg")

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")


def render_svg(d2_path: str, svg_path: str) -> None:
    """d2 CLI로 svg 렌더."""
    subprocess.run(["d2", d2_path, svg_path], check=True)


def _force_fill(elem, color: str) -> None:
    """element의 inline style에 fill을 강제 적용. d2 svg는 .fill-N1 등 CSS 룰을
    내장하고 있어 fill 속성만 바꾸면 CSS 우선순위에 밀려 무시됨. inline style은
    CSS class보다 우선되므로 style attribute에 박는다.
    """
    existing = elem.get("style", "")
    if "fill:" in existing:
        new = re.sub(r"fill\s*:\s*[^;]+;?", f"fill:{color};", existing)
    else:
        new = f"fill:{color};{existing}" if existing else f"fill:{color}"
    elem.set("style", new)


def _add_header_underline(parent, header_rect) -> None:
    """헤더 rect 바닥에 horizontal 검정 line을 부모 g에 추가.
    헤더 흰바탕 + column 흰바탕이라 시각 경계가 사라지므로 명시적 구분선 추가."""
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


def post_process_svg(svg_path: str) -> tuple[int, int, int]:
    """svg 색 후처리 (d2 파일은 손대지 않음). d2 svg 내장 CSS .fill-N1/N7/B5/B4 등이
    inline fill 속성을 override하므로, inline `style="fill:..."`로 강제 적용.
    - sql_table 헤더 rect fill (검정/메서드 색) → 흰색
    - 헤더 y 범위 안 text fill → 원래 헤더 색 (메서드 색 또는 검정)
    - 컨테이너 외곽 rect (fill-B5/B4) → 흰색
    - d2가 schemas 헤더 강조용으로 추가한 class 없는 검정 rect → 흰색 + 같은 y 범위 text 검정
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

    container_changed = 0
    for rect in root.iter(rect_tag):
        cls = rect.get("class", "")
        if "fill-B5" in cls or "fill-B4" in cls:
            _force_fill(rect, "#FFFFFF")
            container_changed += 1

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
    return sql_changed, container_changed, extra_changed

METHOD_COLORS = {
    "get": "#16a34a",
    "post": "#ef4444",
    "patch": "#f59e0b",
}


def load_spec(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def extract_policy(summary: str) -> str:
    match = re.match(r'\[(\w+)\]', summary)
    return match.group(1) if match else "unknown"


def clean_summary(summary: str) -> str:
    return re.sub(r'^\[\w+\]\s*', '', summary)


def safe_id(text: str) -> str:
    return text.replace("/", "_").replace("{", "").replace("}", "").replace("-", "_").lstrip("_")


def find_refs(obj, refs: set):
    """스키마 내 $ref 참조를 재귀적으로 수집."""
    if isinstance(obj, dict):
        for key, val in obj.items():
            if key == "$ref" and isinstance(val, str) and val.startswith("#/components/schemas/"):
                refs.add(val.split("/")[-1])
            else:
                find_refs(val, refs)
    elif isinstance(obj, list):
        for item in obj:
            find_refs(item, refs)


def collect_endpoints(spec: dict) -> dict[str, list[dict]]:
    """paths에서 태그별 엔드포인트 목록 수집."""
    tag_endpoints: dict[str, list[dict]] = {}
    for path, methods in spec.get("paths", {}).items():
        for method, operation in methods.items():
            if method.startswith("x-") or method == "parameters":
                continue
            tags = operation.get("tags", ["Untagged"])
            primary_tag = tags[0]
            summary = operation.get("summary", "")

            req_schema_name = None
            req_body = operation.get("requestBody", {})
            req_content = req_body.get("content", {}).get("application/json", {})
            req_ref = req_content.get("schema", {})
            if "$ref" in req_ref:
                req_schema_name = req_ref["$ref"].split("/")[-1]

            resp_schema_name = None
            resp_is_array = False
            for status_code, response in operation.get("responses", {}).items():
                if not status_code.startswith("2"):
                    continue
                resp_content = response.get("content", {}).get("application/json", {})
                resp_ref = resp_content.get("schema", {})
                if "$ref" in resp_ref:
                    resp_schema_name = resp_ref["$ref"].split("/")[-1]
                elif resp_ref.get("type") == "array" and "$ref" in resp_ref.get("items", {}):
                    resp_schema_name = resp_ref["items"]["$ref"].split("/")[-1]
                    resp_is_array = True

            if primary_tag not in tag_endpoints:
                tag_endpoints[primary_tag] = []
            tag_endpoints[primary_tag].append({
                "method": method.upper(),
                "path": path,
                "operation_id": operation.get("operationId", "unknown"),
                "policy": extract_policy(summary),
                "summary": clean_summary(summary),
                "req_schema": req_schema_name,
                "resp_schema": resp_schema_name,
                "resp_is_array": resp_is_array,
            })
    return tag_endpoints


def render_schema_fields(schema: dict) -> list[str]:
    """스키마 properties를 d2 sql_table 필드로 렌더링."""
    lines = []
    properties = schema.get("properties", {})
    required = schema.get("required", [])
    for prop_name, prop_def in properties.items():
        prop_type = prop_def.get("type", "")
        prop_format = prop_def.get("format", "")
        if "$ref" in prop_def:
            prop_type = prop_def["$ref"].split("/")[-1]
        elif prop_def.get("items", {}).get("$ref"):
            prop_type = f'array<{prop_def["items"]["$ref"].split("/")[-1]}>'
        display = f"{prop_type} ({prop_format})" if prop_format else prop_type
        constraint = " {constraint: required}" if prop_name in required else ""
        lines.append(f'{prop_name}: "{display}"{constraint}')
    return lines


def main():
    spec_path = os.path.abspath(SPEC_PATH)
    if not os.path.exists(spec_path):
        print(f"ERROR: {spec_path} 파일이 없습니다.")
        sys.exit(1)

    spec = load_spec(spec_path)
    all_schemas = spec.get("components", {}).get("schemas", {})
    tag_endpoints = collect_endpoints(spec)
    tag_order = [t["name"] for t in spec.get("tags", [])]

    lines = ["direction: right", ""]
    edges = []

    # 엔드포인트 → 스키마 연결 정보 수집 (인라인 복사본 ID + 스키마 이름)
    inline_copies: list[dict] = []  # { instance_id, schema_name, tag_id, op_id, role, resp_is_array }

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Endpoints 컨테이너 (엔드포인트만)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    lines.append("endpoints: {")
    lines.append('  label: "API Endpoints"')
    lines.append("")

    for tag in tag_order:
        if tag not in tag_endpoints:
            continue
        tag_id = safe_id(tag)
        lines.append(f"  {tag_id}: {{")
        lines.append(f'    label: "{tag}"')
        lines.append("")

        for ep in tag_endpoints[tag]:
            op_id = ep["operation_id"]
            method = ep["method"]
            color = METHOD_COLORS.get(method.lower(), "")

            lines.append(f"    {op_id}: {{")
            lines.append(f"      shape: sql_table")
            if color:
                lines.append(f'      style.fill: "{color}"')
            lines.append(f'      method: "{method}"')
            lines.append(f'      path: "{ep["path"]}"')
            lines.append(f'      policy: "{ep["policy"]}"')
            lines.append(f'      summary: "{ep["summary"]}"')
            lines.append(f"    }}")

            # request/response 연결 정보 수집
            if ep["req_schema"] and ep["req_schema"] in all_schemas:
                inline_copies.append({
                    "instance_id": f"{op_id}_req",
                    "schema_name": ep["req_schema"],
                    "tag_id": tag_id,
                    "op_id": op_id,
                    "role": "request",
                    "resp_is_array": False,
                })

            if ep["resp_schema"] and ep["resp_schema"] in all_schemas:
                inline_copies.append({
                    "instance_id": f"{op_id}_resp",
                    "schema_name": ep["resp_schema"],
                    "tag_id": tag_id,
                    "op_id": op_id,
                    "role": "response",
                    "resp_is_array": ep["resp_is_array"],
                })

        lines.append("  }")
        lines.append("")

    lines.append("}")
    lines.append("")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Schemas 컨테이너 (인라인 복사본 + 하위 참조)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # 하위 참조 스키마 재귀 수집
    inline_schema_names: set[str] = set()
    for copy in inline_copies:
        inline_schema_names.add(copy["schema_name"])

    sub_schemas: set[str] = set()
    for schema_name in inline_schema_names:
        refs = set()
        find_refs(all_schemas[schema_name], refs)
        for ref in refs:
            if ref != schema_name:
                sub_schemas.add(ref)

    def collect_deep(name: str, visited: set):
        if name in visited or name not in all_schemas:
            return
        visited.add(name)
        refs = set()
        find_refs(all_schemas[name], refs)
        for ref in refs:
            if ref != name:
                sub_schemas.add(ref)
                collect_deep(ref, visited)

    for name in list(sub_schemas):
        collect_deep(name, set())

    lines.append("schemas: {")
    lines.append('  label: "Schemas"')
    lines.append("")

    # 인라인 복사본 배치
    for copy in inline_copies:
        iid = copy["instance_id"]
        schema_name = copy["schema_name"]
        lines.append(f"  {iid}: {{")
        lines.append(f"    shape: sql_table")
        for field in render_schema_fields(all_schemas[schema_name]):
            lines.append(f"    {field}")
        lines.append(f"  }}")
        label = f"{schema_name}[]" if copy["resp_is_array"] else schema_name
        lines.append(f'  {iid}.label: "{label}"')
        lines.append("")

    # 하위 참조 스키마 배치
    for name in sorted(sub_schemas):
        if name not in all_schemas:
            continue
        lines.append(f"  {name}: {{")
        lines.append(f"    shape: sql_table")
        for field in render_schema_fields(all_schemas[name]):
            lines.append(f"    {field}")
        lines.append(f"  }}")
        lines.append("")

    lines.append("}")
    lines.append("")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 관계선
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # 엔드포인트 → 인라인 복사본 (REQUEST/RESPONSE)
    for copy in inline_copies:
        tag_id = copy["tag_id"]
        op_id = copy["op_id"]
        iid = copy["instance_id"]
        if copy["role"] == "request":
            edges.append(f'endpoints.{tag_id}.{op_id} -> schemas.{iid}: REQUEST {{style.stroke: "#ef4444"; style.font-color: "#ef4444"}}')
        else:
            resp_text = '"RESPONSE[]"' if copy["resp_is_array"] else "RESPONSE"
            edges.append(f'endpoints.{tag_id}.{op_id} -> schemas.{iid}: {resp_text} {{style.stroke: "#3b82f6"; style.font-color: "#3b82f6"}}')

    # 인라인 복사본 → 하위 스키마 ($ref)
    for copy in inline_copies:
        iid = copy["instance_id"]
        schema_name = copy["schema_name"]
        refs = set()
        find_refs(all_schemas[schema_name], refs)
        for ref in refs:
            if ref in sub_schemas:
                edges.append(f"schemas.{iid} -> schemas.{ref}")

    # 하위 스키마 간 $ref
    schema_internal_edges = set()
    for name in sub_schemas:
        if name not in all_schemas:
            continue
        refs = set()
        find_refs(all_schemas[name], refs)
        for ref in refs:
            if ref != name and ref in sub_schemas:
                schema_internal_edges.add(f"schemas.{name} -> schemas.{ref}")

    for edge in sorted(schema_internal_edges):
        edges.append(edge)

    # 관계선 출력
    for edge in edges:
        lines.append(edge)
    lines.append("")

    # 파일 출력
    output_path = os.path.abspath(OUTPUT_PATH)
    with open(output_path, "w") as f:
        f.write("\n".join(lines))

    ep_count = sum(len(eps) for eps in tag_endpoints.values())
    print(f"Endpoints {ep_count}개 + Schemas (복사본 {len(inline_copies)}개 + 하위 {len(sub_schemas)}개) → {output_path}")

    # d2 → svg 렌더 + 색 후처리 (d2 파일은 default 그대로 두고 svg만 수정)
    svg_path = os.path.abspath(SVG_PATH)
    render_svg(output_path, svg_path)
    sql_changed, container_changed, extra_changed = post_process_svg(svg_path)
    print(f"svg 렌더 + 후처리 (sql_table 헤더 {sql_changed} + 컨테이너 {container_changed} + 추가 검정 rect {extra_changed}) → {svg_path}")


if __name__ == "__main__":
    main()
