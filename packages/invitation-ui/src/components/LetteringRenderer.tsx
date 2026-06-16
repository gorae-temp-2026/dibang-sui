import { useRef, useEffect, useLayoutEffect } from 'react';
import { getStroke } from 'perfect-freehand';
import { toolOptions, strokeToFillD } from '../lib/strokeUtils';

export type LetteringTool = 'pen' | 'brush';

export interface LetteringStroke {
  d: string;
  color: string;
  width: number;
  tool?: LetteringTool;
  points?: { x: number; y: number; t: number }[]; // 그린 속도 재생용 타임드 좌표(없으면 fade 폴백)
}

export type LetteringAnimation = 'none' | 'fade-in' | 'draw' | 'typing' | 'stroke-order';

export interface LetteringRenderConfig {
  source: 'text' | 'upload' | 'draw';
  imageUrl: string | null;
  strokes: LetteringStroke[];
  drawViewBox: { width: number; height: number };
  animation: LetteringAnimation;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface Props {
  config: LetteringRenderConfig;
  animKey?: string | number;
}

const STROKE_DUR = 0.45;

// SSR에서 useLayoutEffect 경고 회피(클라이언트=layout, 서버=effect). 두 앱 모두 SPA라 실사용은 layout.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface StrokeTiming {
  duration: number; // 획 활성 지속시간(ms) = 마지막 점 t
  start: number; // 전체 타임라인에서 이 획의 시작 시각(획들을 순서대로 이어붙임)
}

/** 각 획의 재생 시작시각/지속시간. 그린 속도/순서를 그대로 재생하기 위함. */
function buildTimings(strokes: LetteringStroke[]): { timings: StrokeTiming[]; total: number } {
  const timings: StrokeTiming[] = [];
  let acc = 0;
  for (const s of strokes) {
    const pts = s.points ?? [];
    const duration = pts.length ? pts[pts.length - 1].t : 0;
    timings.push({ duration, start: acc });
    acc += duration;
  }
  return { timings, total: acc };
}

/** points 배열에서 p.t <= t인 마지막 인덱스. t가 첫 점보다 이전이면 -1. */
function findPointIndexAtTime(points: { t: number }[], t: number): number {
  if (points.length === 0 || t < points[0].t) return -1;
  // 마지막 점 이상이면 전체
  if (t >= points[points.length - 1].t) return points.length - 1;
  // 이진 탐색
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (points[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function LetteringRenderer({ config, animKey }: Props) {
  const { source, imageUrl, strokes, drawViewBox, animation } = config;
  const isStrokeOrder = animation === 'stroke-order';
  const isFadeIn = animation === 'fade-in';
  const hasTimedPoints = strokes.length > 0 && strokes.every((s) => s.points && s.points.length > 0);
  const timed = isStrokeOrder && hasTimedPoints;

  // 각 획 <path> DOM 참조 + 최신 strokes ref
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const strokesRef = useRef(strokes);

  // 최신 strokes 보관 — 리플레이가 stale 안 되게, 또 stroke 추가마다 재시작 안 하게(편집 중 정적 노출).
  useEffect(() => {
    strokesRef.current = strokes;
  });

  // 타임드 리플레이: animKey 변경(재생 버튼)/mount 시 그린 속도/순서대로 재생.
  // 매 프레임 partial points -> getStroke -> fill path로 그린 순서 애니메이션 구현.
  useIsoLayoutEffect(() => {
    if (!timed) return;
    if (typeof requestAnimationFrame === 'undefined') return; // SSR/비지원 가드
    const currentStrokes = strokesRef.current;
    const { timings, total } = buildTimings(currentStrokes);
    if (total <= 0) return;
    // 시작: 전부 숨김(깜빡임 방지 위해 paint 전 layout effect에서 설정)
    currentStrokes.forEach((_, i) => {
      const el = pathRefs.current[i];
      if (el) el.setAttribute('d', '');
    });
    let raf = 0;
    let startTime = 0;
    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      timings.forEach((tm, i) => {
        const el = pathRefs.current[i];
        if (!el) return;
        const s = currentStrokes[i];
        const pts = s.points ?? [];
        const local = elapsed - tm.start;
        if (local <= 0) {
          // 아직 이 획 시작 전
          el.setAttribute('d', '');
        } else if (local >= tm.duration) {
          // 이 획 완료 — 원본 fill path 복원
          el.setAttribute('d', s.d);
        } else {
          // 진행 중: partial points를 slice해서 getStroke로 실시간 fill path 생성
          const idx = findPointIndexAtTime(pts, local);
          if (idx < 0) {
            el.setAttribute('d', '');
          } else {
            const partial = pts.slice(0, idx + 1);
            const outline = getStroke(partial, toolOptions(s.tool, s.width));
            el.setAttribute('d', strokeToFillD(outline));
          }
        }
      });
      if (elapsed < total) {
        raf = requestAnimationFrame(tick);
      } else {
        // 완료: 모든 획을 원본 fill path로 확정
        currentStrokes.forEach((s, i) => {
          const el = pathRefs.current[i];
          if (el) el.setAttribute('d', s.d);
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
    // 재생 트리거는 animKey(재생 버튼)/mount뿐. timed/strokes는 클로저/ref로 읽어
    // 편집 중(획 추가)엔 재시작하지 않는다.
  }, [animKey]);

  if (source === 'upload' && imageUrl) {
    return (
      <div
        key={animKey}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(isFadeIn ? { animation: 'dtLetterFadeIn 1s ease both' } : {}),
        }}
      >
        <style>{`@keyframes dtLetterFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        <img src={imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
      </div>
    );
  }

  if (source === 'draw' && strokes.length > 0) {
    return (
      <svg
        key={animKey}
        viewBox={`0 0 ${drawViewBox.width} ${drawViewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          overflow: 'visible',
          ...(isFadeIn ? { animation: 'dtLetterFadeIn 1s ease both' } : {}),
        }}
      >
        <style>{`
          @keyframes dtStrokeReveal { from { opacity: 0; } to { opacity: 1; } }
          @keyframes dtLetterFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
        {/* 붓 fillOpacity 0.7은 에디터 LetteringDrawBoard 미리보기와 동일해야 함(미리보기=발행) */}
        {strokes.map((s, i) => (
          <path
            key={`${animKey ?? ''}-${i}`}
            ref={(el) => {
              pathRefs.current[i] = el;
            }}
            d={timed ? '' : s.d}
            fill={s.color}
            fillOpacity={s.tool === 'brush' ? 0.7 : 1}
            stroke="none"
            style={
              !timed && isStrokeOrder
                ? {
                    opacity: 0,
                    animation: `dtStrokeReveal ${STROKE_DUR}s ease forwards`,
                    animationDelay: `${i * STROKE_DUR}s`,
                  }
                : undefined
            }
          />
        ))}
      </svg>
    );
  }

  return null;
}
