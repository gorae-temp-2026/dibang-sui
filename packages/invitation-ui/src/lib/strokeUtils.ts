import type { StrokeOptions } from 'perfect-freehand';

export type LetteringTool = 'pen' | 'brush';

// 펜: 균일 굵기(thinning 0). 붓: 속도 빠르면 얇아짐(thinning 0.5 + simulatePressure로 속도->압력 추정).
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

/** 도구/굵기 -> perfect-freehand 옵션. undefined(미지정)는 펜으로 취급. */
export function toolOptions(tool: LetteringTool | undefined, width: number): StrokeOptions {
  const base = tool === 'brush' ? BRUSH_STROKE_OPTIONS : PEN_STROKE_OPTIONS;
  return { ...base, size: tool === 'brush' ? width * 2 : width };
}

/** perfect-freehand outline 점 배열 -> SVG fill path d 문자열. */
export function strokeToFillD(stroke: number[][]): string {
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
