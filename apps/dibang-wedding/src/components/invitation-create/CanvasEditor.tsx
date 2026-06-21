import { useState, useRef, useEffect, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { canvasEditorMachine } from '../../machines/canvasEditor.machine';
import { Stage, Layer, Rect, Group, Path, Text, Image as KImage, Transformer } from 'react-konva';
import type Konva from 'konva';
import useImage from 'use-image';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CanvasConfig, CanvasItem, CanvasImage, CanvasDrawing } from '../../types/canvasConfig';
import { SYSTEM_FONTS, type LetteringTool } from '../../types/invitationDesignConfig';
import { pointsToFillPath, pointsToFillPathWithBounds, toolOptions, type DrawPoint } from '../../lib/letteringPath';
import { STICKER_PRESETS } from '../../lib/stickerPresets';
import { FontSelect } from './FontSelect';
import { inputClass } from './styles';

type Tool = 'select' | 'draw' | 'text' | 'image';

interface CanvasEditorProps {
  config: CanvasConfig;
  onChange: (config: CanvasConfig) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}

const TOOLS: { value: Tool; label: string }[] = [
  { value: 'select', label: '선택' },
  { value: 'draw', label: '그리기' },
  { value: 'text', label: '텍스트' },
  { value: 'image', label: '이미지' },
];

const chipBase = 'rounded-lg border px-3 py-1.5 text-base font-medium transition-colors disabled:opacity-40';
const chip = (active: boolean) =>
  `${chipBase} ${active ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`;

const DRAW_TOOLS: { value: LetteringTool; label: string }[] = [
  { value: 'pen', label: '펜' },
  { value: 'brush', label: '붓' },
];
const MIN_WIDTH = 1;
const MAX_WIDTH = 12;
const DEFAULT_WIDTH = 4;
const DEFAULT_DRAW_COLOR = '#222222';

const DEFAULT_TEXT = '텍스트 입력';
const DEFAULT_FONT_SIZE = 24;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 80;
const DEFAULT_FONT_FAMILY = 'Pretendard';
const DEFAULT_TEXT_COLOR = '#222222';
const MIN_ITEM_SIZE = 20;

const genCanvasId = () => crypto.randomUUID();

/* ---------- Konva 하위 컴포넌트 ---------- */

/** Konva Image — use-image 훅 규칙상 별도 컴포넌트로 분리. */
function KonvaImageItem({
  item,
  commonProps,
}: {
  item: CanvasImage;
  commonProps: KonvaCommonProps;
}) {
  const [img] = useImage(item.imageUrl, 'anonymous');
  return (
    <KImage
      image={img}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      {...commonProps}
    />
  );
}


/** 각 Konva 요소에 공통으로 전달하는 props. */
interface KonvaCommonProps {
  draggable: boolean;
  ref: (node: Konva.Node | null) => void;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTap: (e: Konva.KonvaEventObject<Event>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

/* ---------- 레이어 패널 ---------- */

/** 레이어 목록에 표시할 요소 라벨. */
function layerLabel(item: CanvasItem): string {
  if (item.type === 'drawing') return '그리기';
  if (item.type === 'text') {
    const t = item.text.trim();
    if (!t) return '텍스트';
    return t.length > 14 ? `${t.slice(0, 14)}…` : t;
  }
  return item.isSticker ? '스티커' : '이미지';
}

interface LayerRowProps {
  item: CanvasItem;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function LayerRow({ item, label, selected, onSelect, onRemove }: LayerRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors cursor-grab active:cursor-grabbing touch-none ${
        selected ? 'border-sky-400 bg-sky-50' : 'border-gray-200 bg-white hover:border-gray-300'
      } ${isDragging ? 'opacity-80 shadow-lg z-10' : ''}`}
    >
      <span className="text-gray-400 shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <button
        type="button"
        onClick={onSelect}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`레이어 선택: ${label}`}
        className="flex-1 min-w-0 truncate text-left text-sm text-gray-700"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="레이어 삭제"
        className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
      >
        삭제
      </button>
    </li>
  );
}

/* ---------- 메인 에디터 ---------- */

export function CanvasEditor({ config, onChange, onUploadImage }: CanvasEditorProps) {
  // 도구 모드(tool)·이미지 탭·업로드 진행은 머신(canvasEditor). 그리기/선택은 캔버스 로컬 유지.
  const [canvasState, canvasSend] = useMachine(canvasEditorMachine);
  const tool = canvasState.context.tool;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 그리기 도구 설정 + 진행 중 획
  const [drawTool, setDrawTool] = useState<LetteringTool>('pen');
  const [drawColor, setDrawColor] = useState(DEFAULT_DRAW_COLOR);
  const [drawWidth, setDrawWidth] = useState(DEFAULT_WIDTH);
  const [current, setCurrent] = useState<DrawPoint[]>([]);
  const currentRef = useRef<DrawPoint[]>([]);
  const drawingRef = useRef(false);
  const [drawRedo, setDrawRedo] = useState<CanvasItem[]>([]);

  // 이미지/스티커 도구
  const imageTab = canvasState.context.imageTab;
  const uploading = canvasState.matches('uploading');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Konva refs
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Map<string, Konva.Node>>(new Map());

  const { viewBox } = config;
  const ordered = [...config.items].sort((a, b) => a.zIndex - b.zIndex);
  const selectedItem = config.items.find((it) => it.id === selectedId) ?? null;

  // Transformer를 선택된 요소에 연결
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = selectedId ? shapeRefs.current.get(selectedId) : null;
    if (node && !editingId) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, editingId]);

  const updateItem = useCallback(
    (id: string, partial: Partial<CanvasItem>) => {
      onChange({
        ...config,
        items: config.items.map((it) => (it.id === id ? ({ ...it, ...partial } as CanvasItem) : it)),
      });
    },
    [config, onChange],
  );

  const removeItem = useCallback(
    (id: string) => {
      onChange({ ...config, items: config.items.filter((it) => it.id !== id) });
      setSelectedId(null);
      setEditingId(null);
    },
    [config, onChange],
  );

  const addItem = useCallback(
    (item: CanvasItem) => {
      onChange({ ...config, items: [...config.items, item] });
    },
    [config, onChange],
  );

  const nextZIndex = () =>
    config.items.length ? Math.max(...config.items.map((it) => it.zIndex)) + 1 : 0;

  const deselect = () => {
    setSelectedId(null);
    setEditingId(null);
  };

  // --- 그리기 ---

  const getStagePointer = (): DrawPoint | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x, y: pos.y };
  };

  const onDrawDown = () => {
    const pt = getStagePointer();
    if (!pt) return;
    drawingRef.current = true;
    currentRef.current = [pt];
    setCurrent(currentRef.current);
  };

  const onDrawMove = () => {
    if (!drawingRef.current) return;
    const pt = getStagePointer();
    if (!pt) return;
    currentRef.current = [...currentRef.current, pt];
    setCurrent(currentRef.current);
  };

  const onDrawUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = currentRef.current;
    const res = pointsToFillPathWithBounds(pts, toolOptions(drawTool, drawWidth));
    if (res) {
      addItem({
        id: genCanvasId(),
        type: 'drawing',
        strokes: [{ d: res.d, color: drawColor, width: drawWidth, tool: drawTool }],
        viewBox: { width: res.bounds.width, height: res.bounds.height },
        x: Math.round(res.bounds.x),
        y: Math.round(res.bounds.y),
        width: Math.round(res.bounds.width),
        height: Math.round(res.bounds.height),
        rotation: 0,
        zIndex: nextZIndex(),
      });
      setDrawRedo([]);
    }
    currentRef.current = [];
    setCurrent([]);
  };

  const undoDraw = () => {
    const drawings = config.items.filter((it) => it.type === 'drawing');
    if (drawings.length === 0) return;
    const last = drawings[drawings.length - 1];
    if (selectedId === last.id) deselect();
    onChange({ ...config, items: config.items.filter((it) => it.id !== last.id) });
    setDrawRedo((r) => [...r, last]);
  };

  const redoDraw = () => {
    if (drawRedo.length === 0) return;
    const restored = drawRedo[drawRedo.length - 1];
    setDrawRedo((r) => r.slice(0, -1));
    onChange({ ...config, items: [...config.items, { ...restored, zIndex: nextZIndex() }] });
  };

  // --- 텍스트 ---

  const addTextAt = (x: number, y: number) => {
    const id = genCanvasId();
    addItem({
      id,
      type: 'text',
      text: DEFAULT_TEXT,
      x: Math.round(x),
      y: Math.round(y),
      width: 200,
      height: 40,
      fontSize: DEFAULT_FONT_SIZE,
      fontFamily: DEFAULT_FONT_FAMILY,
      color: DEFAULT_TEXT_COLOR,
      rotation: 0,
      zIndex: nextZIndex(),
    });
    setSelectedId(id);
    setEditingId(id);
    canvasSend({ type: 'SET_TOOL', tool: 'select' });
  };

  // --- 이미지/스티커 ---

  const addImageItem = (url: string, isSticker: boolean, w: number, h: number) => {
    const id = genCanvasId();
    addItem({
      id,
      type: 'image',
      imageUrl: url,
      isSticker,
      x: Math.round((viewBox.width - w) / 2),
      y: Math.round((viewBox.height - h) / 2),
      width: w,
      height: h,
      rotation: 0,
      zIndex: nextZIndex(),
    });
    setSelectedId(id);
    canvasSend({ type: 'SET_TOOL', tool: 'select' });
  };

  const loadImageDims = (url: string): Promise<{ width: number; height: number } | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });

  const handlePickImageFile = async (file: File) => {
    canvasSend({ type: 'UPLOAD_START' });
    try {
      const url = await onUploadImage(file);
      if (!url) return;
      const dims = await loadImageDims(url);
      const baseW = 150;
      const h = dims && dims.width > 0 ? Math.round(baseW * (dims.height / dims.width)) : baseW;
      addImageItem(url, false, baseW, h);
    } finally {
      canvasSend({ type: 'UPLOAD_DONE' });
    }
  };

  // --- Stage 이벤트 핸들러 ---

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'draw') {
      onDrawDown();
      return;
    }
    if (tool === 'text') {
      const pt = getStagePointer();
      if (pt) addTextAt(pt.x, pt.y);
      return;
    }
    // select/image 도구: 빈 영역 클릭 시 선택 해제
    if (e.target === e.target.getStage()) {
      deselect();
    }
  };

  const handleStageMouseMove = () => {
    if (tool === 'draw') onDrawMove();
  };

  const handleStageMouseUp = () => {
    if (tool === 'draw') onDrawUp();
  };

  const handleStageTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    if (tool === 'draw') {
      onDrawDown();
      return;
    }
    if (tool === 'text') {
      const pt = getStagePointer();
      if (pt) addTextAt(pt.x, pt.y);
      return;
    }
    if (e.target === e.target.getStage()) {
      deselect();
    }
  };

  const handleStageTouchMove = () => {
    if (tool === 'draw') onDrawMove();
  };

  const handleStageTouchEnd = () => {
    if (tool === 'draw') onDrawUp();
  };

  // --- 공통 Konva props ---

  const makeCommonProps = (item: CanvasItem): KonvaCommonProps => ({
    draggable: (tool === 'select' || tool === 'image') && editingId !== item.id,
    ref: (node: Konva.Node | null) => {
      if (node) shapeRefs.current.set(item.id, node);
      else shapeRefs.current.delete(item.id);
    },
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (tool === 'draw' || tool === 'text') return;
      e.cancelBubble = true;
      setSelectedId(item.id);
    },
    onTap: (e: Konva.KonvaEventObject<Event>) => {
      if (tool === 'draw' || tool === 'text') return;
      e.cancelBubble = true;
      setSelectedId(item.id);
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      updateItem(item.id, {
        x: Math.round(e.target.x()),
        y: Math.round(e.target.y()),
      });
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      updateItem(item.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: Math.max(MIN_ITEM_SIZE, Math.round(node.width() * scaleX)),
        height: Math.max(MIN_ITEM_SIZE, Math.round(node.height() * scaleY)),
        rotation: Math.round(node.rotation()),
      });
    },
  });

  // Drawing의 Group에는 scaleX/scaleY가 이미 적용되므로, onTransformEnd 처리가 다르다.
  const makeDrawingCommonProps = (item: CanvasDrawing): KonvaCommonProps => {
    const base = makeCommonProps(item);
    return {
      ...base,
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target as Konva.Group;
        // Group의 현재 scale은 (요소 viewBox → 요소 width) * (Transformer가 적용한 추가 scale)
        // Transformer가 적용한 추가 scale만 추출해서 width/height에 반영한다.
        const baseScaleX = item.width / item.viewBox.width;
        const baseScaleY = item.height / item.viewBox.height;
        const totalScaleX = node.scaleX();
        const totalScaleY = node.scaleY();
        const addedScaleX = totalScaleX / baseScaleX;
        const addedScaleY = totalScaleY / baseScaleY;
        const newWidth = Math.max(MIN_ITEM_SIZE, Math.round(item.width * addedScaleX));
        const newHeight = Math.max(MIN_ITEM_SIZE, Math.round(item.height * addedScaleY));
        // 기본 scale로 리셋
        node.scaleX(newWidth / item.viewBox.width);
        node.scaleY(newHeight / item.viewBox.height);
        updateItem(item.id, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: newWidth,
          height: newHeight,
          rotation: Math.round(node.rotation()),
        });
      },
    };
  };

  // --- 텍스트 편집 overlay ---

  const getTextareaStyle = (): React.CSSProperties | null => {
    if (!editingId) return null;
    const item = config.items.find((it) => it.id === editingId);
    if (!item || item.type !== 'text') return null;
    const node = shapeRefs.current.get(editingId);
    const stage = stageRef.current;
    if (!node || !stage) return null;
    const stageBox = stage.container().getBoundingClientRect();
    const absPos = node.getAbsolutePosition();
    return {
      position: 'absolute',
      left: stageBox.left - stageBox.left + absPos.x, // stage wrapper의 position:relative 기준
      top: absPos.y,
      width: item.width,
      minHeight: item.height,
      fontSize: item.fontSize,
      fontFamily: item.fontFamily,
      color: item.color,
      lineHeight: 1.2,
      border: 'none',
      outline: '2px solid #38bdf8',
      background: 'transparent',
      resize: 'none' as const,
      padding: 0,
      margin: 0,
      transformOrigin: 'left top',
      transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
      zIndex: 9999,
    };
  };

  const editingItem = editingId ? config.items.find((it) => it.id === editingId) : null;
  const textareaStyle = getTextareaStyle();

  // --- 레이어 패널 ---

  const layers = [...ordered].reverse();

  const layerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLayerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = layers.findIndex((it) => it.id === active.id);
    const newIndex = layers.findIndex((it) => it.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(layers, oldIndex, newIndex);
    const zById = new Map(reordered.map((it, i) => [it.id, reordered.length - 1 - i]));
    onChange({
      ...config,
      items: config.items.map((it) => ({ ...it, zIndex: zById.get(it.id) ?? it.zIndex })),
    });
  };

  // --- 그리기 미리보기 path ---

  const previewD = current.length > 0 ? pointsToFillPath(current, toolOptions(drawTool, drawWidth)) : '';

  return (
    <div className="space-y-3">
      {/* 섹션 헤더 */}
      <div className="space-y-2">
        <label className="block">
          <span className="block text-base text-gray-700 mb-1">부제목 (영문)</span>
          <input
            type="text"
            value={config.subtitle ?? ''}
            onChange={(e) => onChange({ ...config, subtitle: e.target.value })}
            placeholder="Canvas"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="block text-base text-gray-700 mb-1">제목 (한글)</span>
          <input
            type="text"
            value={config.title ?? ''}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
            placeholder="그림판"
            className={inputClass}
          />
        </label>
      </div>

      {/* 도구 바 */}
      <div className="flex flex-wrap items-center gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              canvasSend({ type: 'SET_TOOL', tool: t.value });
              deselect();
            }}
            className={chip(tool === t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 설정 존 */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 min-h-[150px]">
        {tool === 'draw' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base text-gray-700">도구</span>
              {DRAW_TOOLS.map((t) => (
                <button key={t.value} type="button" onClick={() => setDrawTool(t.value)} className={chip(drawTool === t.value)}>
                  {t.label}
                </button>
              ))}
              <span className="text-base text-gray-700 ml-2">색</span>
              {['#222222', '#e00000', '#1a6be0', '#ffffff'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDrawColor(c)}
                  className={`w-7 h-7 shrink-0 rounded-full border-2 transition-colors ${drawColor.toLowerCase() === c.toLowerCase() ? 'border-sky-500 ring-2 ring-sky-200' : 'border-gray-200 hover:border-gray-400'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="relative w-7 h-7 shrink-0 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center transition-colors" style={{ backgroundColor: drawColor }}>
                <span className="text-white text-sm font-bold leading-none drop-shadow-[0_0_2px_rgba(0,0,0,.5)]">+</span>
                <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} aria-label="획 색" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base text-gray-700 shrink-0">굵기</span>
              <input
                type="range"
                min={MIN_WIDTH}
                max={MAX_WIDTH}
                step={1}
                value={drawWidth}
                onChange={(e) => setDrawWidth(Number(e.target.value))}
                aria-label="획 굵기"
                className="flex-1 accent-sky-500 cursor-pointer"
              />
              <span className="text-sm text-gray-500 tabular-nums w-6 text-right">{drawWidth}</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className={chip(false)} onClick={undoDraw} disabled={!config.items.some((it) => it.type === 'drawing')}>
                되돌리기
              </button>
              <button type="button" className={chip(false)} onClick={redoDraw} disabled={drawRedo.length === 0}>
                앞으로
              </button>
            </div>
          </div>
        ) : tool === 'image' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button type="button" className={chip(imageTab === 'upload')} onClick={() => canvasSend({ type: 'SET_IMAGE_TAB', tab: 'upload' })}>
                이미지 업로드
              </button>
              <button type="button" className={chip(imageTab === 'sticker')} onClick={() => canvasSend({ type: 'SET_IMAGE_TAB', tab: 'sticker' })}>
                이모지 스티커
              </button>
            </div>
            {imageTab === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePickImageFile(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {uploading ? '업로드 중...' : '이미지 선택'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {STICKER_PRESETS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addImageItem(s.url, true, 120, 120)}
                    aria-label={s.name}
                    className="aspect-square rounded-lg border border-gray-200 bg-white p-2 hover:border-sky-300 transition-colors"
                  >
                    <img src={s.url} alt={s.name} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : selectedItem ? (
          <div className="space-y-2">
            {selectedItem.type === 'text' && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base text-gray-700">폰트</span>
                  <FontSelect
                    value={selectedItem.fontFamily}
                    onChange={(font) => updateItem(selectedItem.id, { fontFamily: font })}
                    fonts={SYSTEM_FONTS}
                    className="min-w-[160px]"
                  />
                  <span className="text-base text-gray-700 ml-2">색</span>
                  <label className="relative w-7 h-7 shrink-0 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center transition-colors" style={{ backgroundColor: selectedItem.color }}>
                    <span className="text-white text-sm font-bold leading-none drop-shadow-[0_0_2px_rgba(0,0,0,.5)]">+</span>
                    <input type="color" value={selectedItem.color} onChange={(e) => updateItem(selectedItem.id, { color: e.target.value })} aria-label="텍스트 색" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base text-gray-700 shrink-0">크기</span>
                  <input
                    type="range"
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    step={1}
                    value={selectedItem.fontSize}
                    onChange={(e) => updateItem(selectedItem.id, { fontSize: Number(e.target.value) })}
                    aria-label="글씨 크기"
                    className="flex-1 accent-sky-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 tabular-nums w-8 text-right">{selectedItem.fontSize}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">선택된 요소</span>
              <button
                type="button"
                onClick={() => removeItem(selectedItem.id)}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        ) : (
          <p className="text-base text-gray-500">요소를 선택하거나 위 도구를 골라 편집하세요.</p>
        )}
      </div>

      {/* 캔버스 영역 — Konva Stage */}
      <div className="overflow-x-auto">
        <div
          className="relative mx-auto border border-gray-300 rounded-lg overflow-hidden"
          style={{ width: viewBox.width, height: viewBox.height }}
        >
          <Stage
            ref={stageRef}
            width={viewBox.width}
            height={viewBox.height}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onTouchStart={handleStageTouchStart}
            onTouchMove={handleStageTouchMove}
            onTouchEnd={handleStageTouchEnd}
            style={{
              cursor: tool === 'draw' ? 'crosshair' : tool === 'text' ? 'text' : 'default',
            }}
          >
            <Layer>
              {/* 배경 */}
              <Rect
                x={0}
                y={0}
                width={viewBox.width}
                height={viewBox.height}
                fill={config.backgroundColor === 'transparent' ? '#ffffff' : config.backgroundColor}
                listening={false}
              />

              {/* 요소 렌더 */}
              {ordered.map((item) => {
                if (item.type === 'drawing') {
                  const props = makeDrawingCommonProps(item);
                  return (
                    <Group
                      key={item.id}
                      x={item.x}
                      y={item.y}
                      width={item.width}
                      height={item.height}
                      scaleX={item.width / item.viewBox.width}
                      scaleY={item.height / item.viewBox.height}
                      rotation={item.rotation}
                      draggable={props.draggable}
                      ref={(node) => props.ref(node)}
                      onClick={props.onClick}
                      onTap={props.onTap}
                      onDragEnd={props.onDragEnd}
                      onTransformEnd={props.onTransformEnd}
                    >
                      {item.strokes.map((s, i) => (
                        <Path
                          key={i}
                          data={s.d}
                          fill={s.color}
                          opacity={s.tool === 'brush' ? 0.7 : 1}
                          stroke="transparent"
                          strokeWidth={20}
                        />
                      ))}
                    </Group>
                  );
                }

                if (item.type === 'text') {
                  const isEmpty = !item.text.trim();
                  const props = makeCommonProps(item);
                  return (
                    <Text
                      key={item.id}
                      x={item.x}
                      y={item.y}
                      text={isEmpty ? DEFAULT_TEXT : item.text}
                      fontSize={item.fontSize}
                      fontFamily={item.fontFamily}
                      fill={isEmpty ? '#9ca3af' : item.color}
                      width={item.width}
                      rotation={item.rotation}
                      visible={editingId !== item.id}
                      draggable={props.draggable}
                      ref={(node) => props.ref(node)}
                      onClick={props.onClick}
                      onTap={props.onTap}
                      onDragEnd={props.onDragEnd}
                      onTransformEnd={props.onTransformEnd}
                      onDblClick={() => {
                        setSelectedId(item.id);
                        setEditingId(item.id);
                      }}
                      onDblTap={() => {
                        setSelectedId(item.id);
                        setEditingId(item.id);
                      }}
                    />
                  );
                }

                // image
                const imgProps = makeCommonProps(item);
                return (
                  <KonvaImageItem
                    key={item.id}
                    item={item}
                    commonProps={imgProps}
                  />
                );
              })}

              {/* 그리기 미리보기 */}
              {previewD && (
                <Path
                  data={previewD}
                  fill={drawColor}
                  opacity={drawTool === 'brush' ? 0.7 : 1}
                  listening={false}
                />
              )}

              {/* Transformer — 선택된 요소에 핸들 표시 */}
              <Transformer
                ref={transformerRef}
                rotateEnabled
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                boundBoxFunc={(_oldBox, newBox) => {
                  if (newBox.width < MIN_ITEM_SIZE || newBox.height < MIN_ITEM_SIZE) return _oldBox;
                  return newBox;
                }}
              />
            </Layer>
          </Stage>

          {/* 텍스트 편집 overlay — Stage 위에 HTML textarea 배치 */}
          {editingId && editingItem && editingItem.type === 'text' && textareaStyle && (
            <textarea
              autoFocus
              ref={(el) => {
                if (el && editingItem.type === 'text' && editingItem.text === DEFAULT_TEXT) el.select();
              }}
              value={editingItem.text}
              onChange={(e) => updateItem(editingId, { text: e.target.value })}
              onBlur={() => {
                if (editingItem.type === 'text' && !editingItem.text.trim()) {
                  removeItem(editingId);
                } else {
                  setEditingId(null);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={textareaStyle}
            />
          )}
        </div>
      </div>

      {/* 레이어 패널 */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="mb-2 text-base font-medium text-gray-700">레이어</div>
        {ordered.length === 0 ? (
          <p className="text-base text-gray-500">추가된 요소가 없습니다.</p>
        ) : (
          <DndContext sensors={layerSensors} collisionDetection={closestCorners} onDragEnd={handleLayerDragEnd}>
            <SortableContext items={layers.map((it) => it.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1.5">
                {(() => {
                  const baseCounts = new Map<string, number>();
                  layers.forEach((it) => {
                    const base = layerLabel(it);
                    baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
                  });
                  const runCounts = new Map<string, number>();
                  return layers.map((item) => {
                    const base = layerLabel(item);
                    const total = baseCounts.get(base) ?? 1;
                    let label = base;
                    if (total > 1) {
                      const n = (runCounts.get(base) ?? 0) + 1;
                      runCounts.set(base, n);
                      label = `${base} ${n}`;
                    }
                    return (
                      <LayerRow
                        key={item.id}
                        item={item}
                        label={label}
                        selected={selectedId === item.id}
                        onSelect={() => {
                          setSelectedId(item.id);
                          canvasSend({ type: 'SET_TOOL', tool: 'select' });
                        }}
                        onRemove={() => removeItem(item.id)}
                      />
                    );
                  });
                })()}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
