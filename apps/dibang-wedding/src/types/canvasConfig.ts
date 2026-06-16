import type { LetteringStroke } from './invitationDesignConfig';

/** 그림판(canvas) 섹션의 한 요소 공통 속성. 위치·크기·회전·레이어는 모든 요소가 공유. */
export interface CanvasElementBase {
  id: string;
  type: 'drawing' | 'text' | 'image';
  x: number; // 캔버스 viewBox 기준 위치(px)
  y: number;
  width: number; // 요소 크기(px)
  height: number;
  rotation: number; // 각도(deg)
  zIndex: number; // 레이어 순서(작을수록 아래)
}

export interface CanvasDrawing extends CanvasElementBase {
  type: 'drawing';
  strokes: LetteringStroke[]; // 레터링 직접 그리기와 동일한 획 표현 재사용
  viewBox: { width: number; height: number };
}

export interface CanvasText extends CanvasElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface CanvasImage extends CanvasElementBase {
  type: 'image';
  imageUrl: string;
  isSticker: boolean; // true=기본 제공 스티커, false=사용자 업로드 이미지
}

export type CanvasItem = CanvasDrawing | CanvasText | CanvasImage;

export interface CanvasConfig {
  title?: string; // 그림판 섹션 제목(한글) — 다른 섹션 헤더와 동일 스타일
  subtitle?: string; // 그림판 섹션 부제목(영문)
  items: CanvasItem[];
  backgroundColor: string; // 기본 'transparent'
  viewBox: { width: number; height: number }; // 캔버스 좌표계
}

export function makeDefaultCanvasConfig(): CanvasConfig {
  return {
    title: '그림판',
    subtitle: 'Canvas',
    items: [],
    backgroundColor: 'transparent',
    viewBox: { width: 390, height: 500 },
  };
}
