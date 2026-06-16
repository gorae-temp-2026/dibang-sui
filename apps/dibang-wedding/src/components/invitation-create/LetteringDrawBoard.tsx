import { useRef, useState, useEffect, useCallback } from 'react';
import type { LetteringStroke, LetteringTool, TimedPoint } from '../../types/invitationDesignConfig';
import { pointsToFillPath, toolOptions } from '../../lib/letteringPath';

interface Props {
  strokes: LetteringStroke[];
  viewBox: { width: number; height: number };
  onChange: (strokes: LetteringStroke[]) => void;
}

const TOOLS: { value: LetteringTool; label: string }[] = [
  { value: 'pen', label: '펜' },
  { value: 'brush', label: '붓' },
];
const MIN_WIDTH = 1;
const MAX_WIDTH = 12;
const DEFAULT_WIDTH = 4;
const DEFAULT_COLOR = '#222222';

// 활성 드로잉(펜다운) 시간 총 상한 — 펜을 뗀 사이엔 시간이 흐르지 않는다.
const MAX_DRAW_MS = 10000;

const chipBase = 'rounded-lg border px-3 py-1.5 text-base font-medium transition-colors disabled:opacity-40';
const chip = (active: boolean) =>
  `${chipBase} ${active ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`;

/** 붓은 살짝 투명하게(0.7) — 손글씨 붓 느낌. 굵기·가변폭은 perfect-freehand가 처리.
 *  이 0.7은 발행본 LetteringRenderer의 붓 fillOpacity와 일치해야 미리보기=발행 결과가 맞는다. */
const fillOpacity = (tool?: LetteringTool) => (tool === 'brush' ? 0.7 : 1);

/** 한 획의 활성 지속시간(ms) = 마지막 점의 t. points 없으면 0. */
const strokeDuration = (s: LetteringStroke) =>
  s.points && s.points.length ? s.points[s.points.length - 1].t : 0;

export function LetteringDrawBoard({ strokes, viewBox, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<LetteringTool>('pen');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const currentRef = useRef<TimedPoint[]>([]);
  const [current, setCurrent] = useState<TimedPoint[]>([]);
  const drawing = useRef(false);
  const strokeStartRef = useRef(0); // 현재 획 시작 시각(performance.now)
  const committedAtStartRef = useRef(0); // 현재 획 시작 시점의 누적 활성시간(ms)
  const committedRef = useRef<LetteringStroke[]>(strokes);
  const [redoStack, setRedoStack] = useState<LetteringStroke[]>([]);
  useEffect(() => {
    committedRef.current = strokes;
  }, [strokes]);

  const toViewBox = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * viewBox.width,
        y: ((clientY - rect.top) / rect.height) * viewBox.height,
      };
    },
    [viewBox.width, viewBox.height],
  );

  // 진행 중 획을 stroke로 커밋(타임드 points 포함)하고 초기화. 펜업·시간상한 양쪽에서 사용.
  const finishStroke = useCallback(() => {
    const pts = currentRef.current;
    if (pts.length > 0) {
      const stroke: LetteringStroke = {
        d: pointsToFillPath(pts, toolOptions(tool, width)),
        color,
        width,
        tool,
        points: pts.map((p) => ({ x: p.x, y: p.y, t: p.t })),
      };
      const next = [...committedRef.current, stroke];
      committedRef.current = next;
      setRedoStack([]);
      onChange(next);
    }
    currentRef.current = [];
    setCurrent([]);
    drawing.current = false;
  }, [tool, width, color, onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const committedMs = committedRef.current.reduce((sum, s) => sum + strokeDuration(s), 0);
    if (committedMs >= MAX_DRAW_MS) return; // 시간 소진 → 새 획 시작 거부
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch { /* noop */ }
    drawing.current = true;
    committedAtStartRef.current = committedMs;
    strokeStartRef.current = performance.now();
    currentRef.current = [{ ...toViewBox(e.clientX, e.clientY), t: 0 }];
    setCurrent(currentRef.current);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const remaining = MAX_DRAW_MS - committedAtStartRef.current;
    const t = performance.now() - strokeStartRef.current;
    if (t >= remaining) {
      // 시간 상한 도달 → 남은 budget에 맞춰 마지막 점 t 클램프 후 강제 종료
      currentRef.current = [...currentRef.current, { ...toViewBox(e.clientX, e.clientY), t: remaining }];
      setCurrent(currentRef.current);
      finishStroke();
      return;
    }
    currentRef.current = [...currentRef.current, { ...toViewBox(e.clientX, e.clientY), t }];
    setCurrent(currentRef.current);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    try {
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    } catch { /* noop */ }
    finishStroke();
  };

  const undo = () => {
    const cur = committedRef.current;
    if (cur.length === 0) return;
    const removed = cur[cur.length - 1];
    const next = cur.slice(0, -1);
    committedRef.current = next;
    setRedoStack([...redoStack, removed]);
    onChange(next);
  };
  const redo = () => {
    if (redoStack.length === 0) return;
    const restored = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    const next = [...committedRef.current, restored];
    committedRef.current = next;
    onChange(next);
  };
  const clearAll = () => {
    committedRef.current = [];
    setRedoStack([]);
    onChange([]);
  };

  // 활성 드로잉 사용시간: 커밋된 획 지속시간 합 + 진행 중 획의 elapsed(= 마지막 점 t)
  const committedMs = strokes.reduce((sum, s) => sum + strokeDuration(s), 0);
  const liveMs = current.length ? current[current.length - 1].t : 0;
  const usedMs = Math.min(MAX_DRAW_MS, committedMs + liveMs);
  const usedPct = Math.min(100, (usedMs / MAX_DRAW_MS) * 100);
  const exhausted = usedMs >= MAX_DRAW_MS;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-base text-gray-700">도구</span>
        {TOOLS.map((t) => (
          <button key={t.value} type="button" onClick={() => setTool(t.value)} className={chip(tool === t.value)}>
            {t.label}
          </button>
        ))}
        <span className="text-base text-gray-700 ml-2">색</span>
        {['#222222', '#e00000', '#1a6be0', '#ffffff'].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-7 h-7 shrink-0 rounded-full border-2 transition-colors ${color.toLowerCase() === c.toLowerCase() ? 'border-sky-500 ring-2 ring-sky-200' : 'border-gray-200 hover:border-gray-400'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <label className="relative w-7 h-7 shrink-0 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center transition-colors" style={{ backgroundColor: color }}>
          <span className="text-white text-sm font-bold leading-none drop-shadow-[0_0_2px_rgba(0,0,0,.5)]">+</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="획 색" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </label>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-base text-gray-700 shrink-0">굵기</span>
        <input
          type="range"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          step={1}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          aria-label="획 굵기"
          className="flex-1 accent-sky-500 cursor-pointer"
        />
        <span className="text-sm text-gray-500 tabular-nums w-6 text-right">{width}</span>
      </div>

      {/* 그리기 시간 bar — 펜을 대고 그리는 동안에만 차오름(총 10초) */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base text-gray-700 shrink-0">그리기 시간</span>
        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full ${exhausted ? 'bg-red-400' : 'bg-sky-500'} transition-[width] duration-100`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 tabular-nums shrink-0">{(usedMs / 1000).toFixed(1)} / 10초</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}`, cursor: exhausted ? 'not-allowed' : 'crosshair' }}
        className="block w-full rounded-lg border border-gray-300 bg-white touch-none"
      >
        {strokes.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} fillOpacity={fillOpacity(s.tool)} stroke="none" />
        ))}
        {current.length > 0 && (
          <path
            d={pointsToFillPath(current, toolOptions(tool, width))}
            fill={color}
            fillOpacity={fillOpacity(tool)}
            stroke="none"
          />
        )}
      </svg>

      {exhausted && <p className="text-sm text-red-500 mt-1">그리기 시간(10초)을 모두 사용했어요. 되돌리기로 시간을 비울 수 있어요.</p>}

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button type="button" className={chip(false)} onClick={undo} disabled={strokes.length === 0}>
          되돌리기
        </button>
        <button type="button" className={chip(false)} onClick={redo} disabled={redoStack.length === 0}>
          앞으로
        </button>
        <button type="button" className={chip(false)} onClick={clearAll} disabled={strokes.length === 0}>
          전체 지우기
        </button>
        <span className="text-sm text-gray-500 self-center">획 {strokes.length}개</span>
      </div>
    </div>
  );
}
