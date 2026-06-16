import { useState, useRef, useCallback, useEffect } from 'react';
import Moveable from 'react-moveable';
import { useInvitationForm, toPreviewData } from '../../hooks/invitation-create/useInvitationForm';
import { InvitationRenderer } from '@gorae/invitation-ui';
import { PhotoPositionModal } from './PhotoPositionModal';

export function PreviewPanel({ focusedSection, animPlayKey }: { focusedSection?: { section: string; key: number }; animPlayKey?: number } = {}) {
  const store = useInvitationForm();
  const data = toPreviewData(store);
  const [textEl, setTextEl] = useState<HTMLDivElement | null>(null);
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [letteringEl, setLetteringEl] = useState<HTMLDivElement | null>(null);
  const [isLetteringSelected, setIsLetteringSelected] = useState(false);
  const letteringBaseWidth = useRef(95);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // EditPanel 포커스에 연동하여 해당 섹션으로 smooth scroll
  useEffect(() => {
    if (!focusedSection || !containerRef.current) return;
    const target = containerRef.current.querySelector(`[data-section="${focusedSection.section}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusedSection]);

  const handleTextRef = useCallback((el: HTMLDivElement | null) => {
    setTextEl(el);
  }, []);

  const handleLetteringRef = useCallback((el: HTMLDivElement | null) => {
    setLetteringEl(el);
  }, []);

  // 텍스트 클릭 → 선택, 바깥 클릭 → 해제
  useEffect(() => {
    if (!textEl) return;

    const handleTextClick = (e: MouseEvent) => {
      e.stopPropagation();
      setIsTextSelected(true);
    };

    const handleOutsideClick = (e: MouseEvent) => {
      // Moveable 핸들 클릭은 무시
      const target = e.target as HTMLElement;
      if (target.closest('.moveable-control-box')) return;
      if (textEl.contains(target)) return;
      setIsTextSelected(false);
    };

    // imperative DOM mutation은 useEffect 안에서 합당 — react-hooks/immutability의
    // false-positive(외부 컴포넌트 외부 변수 변경 룰이 DOM element style을 잘못 잡음).
    // eslint-disable-next-line react-hooks/immutability
    textEl.style.cursor = 'pointer';
    textEl.addEventListener('click', handleTextClick);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      textEl.removeEventListener('click', handleTextClick);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [textEl]);

  // 레터링(직접 그리기·이미지 업로드) 클릭 → 선택, 바깥 클릭 → 해제 (텍스트와 동일 패턴)
  useEffect(() => {
    if (!letteringEl) return;

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      setIsLetteringSelected(true);
    };
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.moveable-control-box')) return;
      if (letteringEl.contains(target)) return;
      setIsLetteringSelected(false);
    };

    // 텍스트 effect와 동일 사유 — DOM element style 변경에 대한 react-hooks/immutability 오탐
    // eslint-disable-next-line react-hooks/immutability
    letteringEl.style.cursor = 'pointer';
    letteringEl.addEventListener('click', handleClick);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      letteringEl.removeEventListener('click', handleClick);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [letteringEl]);

  const cfg = store.coverTextConfig;
  const lettering = store.designConfig.lettering;

  return (
    <div ref={containerRef} className="flex items-start justify-center overflow-y-auto overflow-x-hidden p-4 md:p-8">
      <div className="relative w-full max-w-[390px] md:w-[390px] shrink-0 bg-white rounded-[32px] overflow-hidden shadow-2xl">
        <InvitationRenderer data={data} hideShare coverTextRef={handleTextRef} coverLetteringRef={handleLetteringRef} animPlayKey={animPlayKey} onEditPhoto={(url) => setEditPhotoUrl(url)} />
        {textEl && (
          <Moveable
            target={textEl}
            draggable={true}
            rotatable={isTextSelected}
            scalable={isTextSelected}
            throttleDrag={1}
            throttleRotate={1}
            throttleScale={0.01}
            renderDirections={isTextSelected ? ["nw", "ne", "sw", "se"] : []}
            rotationPosition="top"
            origin={false}
            hideDefaultLines={!isTextSelected}
            onDragStart={() => { if (!isTextSelected) setIsTextSelected(true); }}
            onDrag={({ beforeTranslate }) => {
              store.setField('coverTextConfig', {
                ...cfg,
                x: Math.round(beforeTranslate[0]),
                y: Math.round(beforeTranslate[1]),
              });
            }}
            onRotate={({ beforeRotate }) => {
              store.setField('coverTextConfig', {
                ...cfg,
                rotation: Math.round(beforeRotate),
              });
            }}
            onScale={({ scale }) => {
              const baseFontSize = 78;
              const newFontSize = Math.round(baseFontSize * scale[0]);
              store.setField('coverTextConfig', {
                ...cfg,
                fontSize: Math.max(30, Math.min(150, newFontSize)),
              });
            }}
          />
        )}
        {letteringEl && (
          <Moveable
            target={letteringEl}
            draggable={true}
            rotatable={isLetteringSelected}
            scalable={isLetteringSelected}
            throttleDrag={1}
            throttleRotate={1}
            throttleScale={0.01}
            renderDirections={isLetteringSelected ? ["nw", "ne", "sw", "se"] : []}
            rotationPosition="top"
            origin={false}
            hideDefaultLines={!isLetteringSelected}
            onDragStart={() => { if (!isLetteringSelected) setIsLetteringSelected(true); }}
            onDrag={({ beforeTranslate }) => {
              store.setLettering({
                ...lettering,
                x: Math.round(beforeTranslate[0]),
                y: Math.round(beforeTranslate[1]),
              });
            }}
            onRotate={({ beforeRotate }) => {
              store.setLettering({ ...lettering, rotation: Math.round(beforeRotate) });
            }}
            onScaleStart={() => { letteringBaseWidth.current = useInvitationForm.getState().designConfig.lettering.width; }}
            onScale={({ scale }) => {
              const s = useInvitationForm.getState();
              s.setLettering({
                ...s.designConfig.lettering,
                width: Math.max(20, Math.min(100, Math.round(letteringBaseWidth.current * scale[0]))),
              });
            }}
          />
        )}
        {editPhotoUrl && (
          <PhotoPositionModal
            url={editPhotoUrl}
            saved={store.galleryPhotoPositions[editPhotoUrl] ?? null}
            onApply={(pos) => store.setGalleryPhotoPosition(editPhotoUrl, pos)}
            onClose={() => setEditPhotoUrl(null)}
          />
        )}
      </div>
    </div>
  );
}
