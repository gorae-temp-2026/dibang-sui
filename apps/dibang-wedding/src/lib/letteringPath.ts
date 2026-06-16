import { getStroke, type StrokeOptions } from 'perfect-freehand';
import type { LetteringTool } from '../types/invitationDesignConfig';

export interface DrawPoint {
  x: number;
  y: number;
}

// 펜: 균일 굵기(thinning 0). 붓: 속도 빠르면 얇아짐(thinning 0.5 + simulatePressure로 속도→압력 추정).
// size(외곽선 지름)는 호출 시 사용자 굵기로 주입한다.
const PEN_STROKE_OPTIONS: StrokeOptions = {
  thinning: 0,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
};

const BRUSH_STROKE_OPTIONS: StrokeOptions = {
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.3,
  simulatePressure: true,
};

/** 도구·굵기 → perfect-freehand 옵션. undefined(미지정)는 펜으로 취급. */
export function toolOptions(tool: LetteringTool | undefined, width: number): StrokeOptions {
  const base = tool === 'brush' ? BRUSH_STROKE_OPTIONS : PEN_STROKE_OPTIONS;
  return { ...base, size: tool === 'brush' ? width * 2 : width };
}

// perfect-freehand outline 점 배열 → SVG fill path(d). perfect-freehand README 표준 변환.
function strokeToFillD(stroke: number[][]): string {
  if (stroke.length === 0) return '';
  const f = (n: number) => n.toFixed(1);
  const d = stroke.reduce<string[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(f(x0), f(y0), f((x0 + x1) / 2), f((y0 + y1) / 2));
      return acc;
    },
    ['M', f(stroke[0][0]), f(stroke[0][1]), 'Q'],
  );
  d.push('Z');
  return d.join(' ');
}

/** 포인터 좌표 배열 → 가변폭 외곽선 fill path(d) 문자열. */
export function pointsToFillPath(points: DrawPoint[], options: StrokeOptions): string {
  if (points.length === 0) return '';
  const stroke = getStroke(points, options);
  return strokeToFillD(stroke);
}

/**
 * 포인터 좌표 → 로컬 좌표(bbox 좌상단 0,0 기준) fill path + 외곽선 bbox.
 * 그림판 그리기 요소가 캔버스 전체가 아니라 "그린 영역만" 차지하는 독립 요소가 되게 한다.
 */
export function pointsToFillPathWithBounds(
  points: DrawPoint[],
  options: StrokeOptions,
): { d: string; bounds: { x: number; y: number; width: number; height: number } } | null {
  if (points.length === 0) return null;
  const stroke = getStroke(points, options);
  if (stroke.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of stroke) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const translated = stroke.map(([x, y]) => [x - minX, y - minY]);
  return {
    d: strokeToFillD(translated),
    bounds: {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    },
  };
}
