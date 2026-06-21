import { setup, assign } from 'xstate';

// canvasEditor.machine — CanvasEditor(청첩장 캔버스 에디터) 모드 flow (XS-22).
// context: tool(select/draw/text/image) + imageTab(upload/sticker). upload 영역: idle/uploading.
// 그리기(drawTool/color/width/current/redo, pointer 고빈도)·객체 선택(selectedId/editingId)은
// 캔버스 로컬 ref/useState로 유지 — 머신은 "어떤 도구 모드 + 이미지 탭 + 업로드 중인가"의
// 저빈도 의미 전환만 담당(STATE_MANAGEMENT §4 + 캔버스 고빈도 예외).

export type CanvasTool = 'select' | 'draw' | 'text' | 'image';
export type ImageTab = 'upload' | 'sticker';

export interface CanvasEditorContext {
  tool: CanvasTool;
  imageTab: ImageTab;
}

export type CanvasEditorEvent =
  | { type: 'SET_TOOL'; tool: CanvasTool }
  | { type: 'SET_IMAGE_TAB'; tab: ImageTab }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_DONE' };

export const canvasEditorMachine = setup({
  types: { context: {} as CanvasEditorContext, events: {} as CanvasEditorEvent },
  actions: {
    setTool: assign({ tool: (_, p: { tool: CanvasTool }) => p.tool }),
    setImageTab: assign({ imageTab: (_, p: { tab: ImageTab }) => p.tab }),
  },
}).createMachine({
  id: 'canvasEditor',
  context: { tool: 'select', imageTab: 'upload' },
  // tool/imageTab은 모드 값 — 어느 상태에서나 전환(전역 on).
  on: {
    SET_TOOL: { actions: { type: 'setTool', params: ({ event }) => ({ tool: event.tool }) } },
    SET_IMAGE_TAB: { actions: { type: 'setImageTab', params: ({ event }) => ({ tab: event.tab }) } },
  },
  // 업로드 진행 표시
  initial: 'idle',
  states: {
    idle: { on: { UPLOAD_START: 'uploading' } },
    uploading: { on: { UPLOAD_DONE: 'idle' } },
  },
});
