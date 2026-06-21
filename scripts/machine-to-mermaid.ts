#!/usr/bin/env tsx
/**
 * machine-to-mermaid — XState v5 머신 → mermaid (stateDiagram-v2 또는 flowchart).
 *
 * 공식 오픈소스 **@xstate/graph** 의 toDirectedGraph() 로 머신을 그래프화한 뒤 mermaid 로 변환한다.
 * Stately Studio(상용·비오픈) 불필요. 같은 코드 → 항상 같은 mermaid 소스(결정적). 머신 코드는 읽기 전용.
 *
 * 두 가지 출력 형식:
 *  --format state      (기본) stateDiagram-v2. 중첩/병렬/initial/final 의미를 정확히 표현.
 *                      내부전이(머무름)는 상태 박스 안 설명줄로. 정식 mermaid 뷰어(VS Code/mermaid.live/GitHub)용.
 *  --format flowchart  Excalidraw 친화. Excalidraw mermaid 변환기는 flowchart/sequence/class 만 네이티브 지원
 *                      (stateDiagram 미지원→이미지 폴백)이라, flowchart 로 뽑으면 self/내부 전이까지 편집 가능한
 *                      네이티브 도형으로 들어간다. 중첩은 subgraph, 모든 전이는 라벨 엣지(자기루프 포함).
 *                      ※ initial/final/병렬 동시성 표기는 flowchart 로는 근사치.
 *
 * 표기:
 *  - always(이벤트리스) 전이는 toDirectedGraph 가 빠뜨림 → StateNode.always 에서 보강.
 *
 * 설치:  pnpm add -D @xstate/graph
 * 사용:  pnpm tsx scripts/machine-to-mermaid.ts <machineFile.ts> <exportName> [--format state|flowchart]
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { toDirectedGraph } from '@xstate/graph';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--'));
const fileArg = positional[0];
const exportArg = positional[1];
const fmtIdx = argv.indexOf('--format');
const format = fmtIdx >= 0 ? argv[fmtIdx + 1] : 'state';
if (!fileArg || !exportArg) {
  console.error('usage: tsx scripts/machine-to-mermaid.ts <machineFile> <exportName> [--format state|flowchart]');
  process.exit(1);
}

// StateNode → 안정적 고유 id (StateNode.id 문자열 기준)
const ids = new Map<string, string>();
const used = new Set<string>();
function sid(sn: Any): string {
  const key = String(sn?.id ?? sn?.key ?? 'state');
  const hit = ids.get(key);
  if (hit) return hit;
  const base = key.replace(/[^A-Za-z0-9_]/g, '_') || 'state';
  let u = base;
  let n = 1;
  while (used.has(u)) u = `${base}_${n++}`;
  used.add(u);
  ids.set(key, u);
  return u;
}

const hasChildren = (sn: Any): boolean => !!(sn?.states && Object.keys(sn.states).length);
const invokeSrcs = (sn: Any): string[] =>
  (sn?.invoke ?? []).map((i: Any) => String(i?.src ?? '')).filter(Boolean);
function stateLabel(sn: Any): string {
  let l = String(sn?.key ?? 'state');
  const inv = invokeSrcs(sn);
  if (inv.length) l += ` · invoke: ${inv.join(', ')}`;
  if (sn?.type === 'final') l += ' «final»';
  if (sn?.type === 'parallel') l += ' (parallel)';
  return l.replace(/"/g, "'");
}
const initialOf = (sn: Any): Any => sn?.initial?.target?.[0];

function prettyEvent(ev: string): string {
  if (!ev) return 'always';
  const a = ev.match(/^xstate\.after\.(\d+)\b/);
  if (a) return `after ${a[1]}ms`;
  if (ev.startsWith('xstate.done.actor')) return 'onDone';
  if (ev.startsWith('xstate.error.actor')) return 'onError';
  if (ev.startsWith('xstate.done.state')) return 'onDone';
  if (ev.startsWith('xstate.')) return ev.split('.').slice(-2).join('.');
  return ev;
}
function guardLabel(t: Any): string {
  const g = t?.guard;
  if (!g) return '';
  const ty = typeof g === 'string' ? g : g?.type;
  if (!ty || /^xstate\.guard/.test(ty)) return ' [guard]';
  return ` [${ty}]`;
}
function actionLabel(t: Any): string {
  const names = (t?.actions ?? [])
    .map((a: Any) => (typeof a === 'string' ? a : a?.type))
    .filter(Boolean)
    .map((n: string) => (n.startsWith('xstate.') ? n.slice(7) : n));
  return names.length ? ` / ${names.join(', ')}` : '';
}
const transLabel = (ev: string, t: Any): string => prettyEvent(String(ev)) + guardLabel(t) + actionLabel(t);

// ── 전이 수집(형식 중립) ──
interface T {
  src: Any;
  tgt: Any;
  label: string;
}
const transitions: T[] = [];
const tSeen = new Set<string>();
function addT(src: Any, tgt: Any, label: string) {
  const k = `${sid(src)}|${sid(tgt)}|${label}`;
  if (!tSeen.has(k)) (tSeen.add(k), transitions.push({ src, tgt, label }));
}
function walkEdges(dnode: Any) {
  const sn = dnode.stateNode;
  for (const e of dnode.edges ?? []) {
    const ev = e?.transition?.eventType ?? e?.label?.text ?? '';
    if (e?.source && e?.target) addT(e.source, e.target, transLabel(ev, e.transition));
  }
  for (const t of sn?.always ?? []) {
    const label = 'always' + guardLabel(t) + actionLabel(t);
    for (const tgt of t?.target ?? []) addT(sn, tgt, label);
  }
  (dnode.children ?? []).forEach(walkEdges);
}

// ── stateDiagram-v2 ──
function toStateDiagram(graph: Any): string {
  const cross: string[] = [];
  const desc = new Map<string, string[]>();
  for (const { src, tgt, label } of transitions) {
    if (src.id === tgt.id && !hasChildren(src)) {
      const k = sid(src);
      const a = desc.get(k) ?? [];
      if (!a.includes(label)) a.push(label);
      desc.set(k, a);
    } else cross.push(`  ${sid(src)} --> ${sid(tgt)} : ${label}`);
  }
  const body: string[] = [];
  const emitChildren = (dnode: Any, pad: string) => {
    const sn = dnode.stateNode;
    const kids: Any[] = dnode.children ?? [];
    if (sn?.type === 'parallel') {
      kids.forEach((k, i) => {
        if (i > 0) body.push(`${pad}--`);
        emitDecl(k, pad);
      });
    } else {
      const init = initialOf(sn);
      if (init) body.push(`${pad}[*] --> ${sid(init)}`);
      kids.forEach((k) => emitDecl(k, pad));
    }
  };
  function emitDecl(dnode: Any, pad: string) {
    const sn = dnode.stateNode;
    const id = sid(sn);
    if ((dnode.children ?? []).length) {
      body.push(`${pad}state "${stateLabel(sn)}" as ${id} {`);
      emitChildren(dnode, pad + '  ');
      body.push(`${pad}}`);
    } else {
      body.push(`${pad}state "${stateLabel(sn)}" as ${id}`);
      for (const d of desc.get(id) ?? []) body.push(`${pad}${id} : ${d}`);
    }
  }
  emitChildren(graph, '  ');
  return ['stateDiagram-v2', ...body, '', ...cross].join('\n');
}

// ── flowchart TD (Excalidraw 친화) ──
function toFlowchart(graph: Any): string {
  const body: string[] = [];
  const emitChildren = (dnode: Any, pad: string) =>
    (dnode.children ?? []).forEach((k: Any) => emitNode(k, pad));
  function emitNode(dnode: Any, pad: string) {
    const sn = dnode.stateNode;
    const id = sid(sn);
    if ((dnode.children ?? []).length) {
      body.push(`${pad}subgraph ${id}["${stateLabel(sn)}"]`);
      emitChildren(dnode, pad + '  ');
      body.push(`${pad}end`);
    } else {
      body.push(`${pad}${id}["${stateLabel(sn)}"]`);
    }
  }
  emitChildren(graph, '  ');
  const edges = transitions.map(({ src, tgt, label }) => `  ${sid(src)} -->|"${label}"| ${sid(tgt)}`);
  return ['flowchart TD', ...body, '', ...edges].join('\n');
}

async function main() {
  const abs = resolve(process.cwd(), fileArg);
  const mod: Record<string, Any> = await import(pathToFileURL(abs).href);
  const machine = mod[exportArg];
  if (!machine?.root) {
    console.error(`export "${exportArg}" 가 v5 머신이 아님. exports: ${Object.keys(mod).join(', ')}`);
    process.exit(1);
  }
  const graph = toDirectedGraph(machine); // ← @xstate/graph
  walkEdges(graph);
  console.log(format === 'flowchart' ? toFlowchart(graph) : toStateDiagram(graph));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
