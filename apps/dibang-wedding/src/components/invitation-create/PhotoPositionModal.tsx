import { useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import type { ImagePosition } from '@gorae/invitation-ui';
import { useT } from '../../lib/i18n';

interface Props {
  url: string;
  saved: ImagePosition | null;
  onApply: (pos: ImagePosition) => void;
  onClose: () => void;
  aspect?: number;
}

export function PhotoPositionModal({ url, saved, onApply, onClose, aspect = 3 / 4 }: Props) {
  const t = useT();
  const [crop, setCrop] = useState<Point>({ x: saved?.editorCrop.x ?? 0, y: saved?.editorCrop.y ?? 0 });
  const [zoom, setZoom] = useState(saved?.zoom ?? 1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const handleCropComplete = (area: Area, _pixels: Area) => {
    setCroppedArea(area);
  };

  const handleApply = () => {
    if (!croppedArea) return;
    onApply({
      cropArea: { x: croppedArea.x, y: croppedArea.y, width: croppedArea.width, height: croppedArea.height },
      zoom,
      editorCrop: { x: crop.x, y: crop.y },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{t('invite.photoPos.title')}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-500">{t('invite.photoPos.hint')}</p>

        <div className="relative w-full rounded-lg overflow-hidden bg-gray-900" style={{ aspectRatio: aspect }}>
          <Cropper
            image={url}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            minZoom={1}
            maxZoom={3}
            showGrid={false}
            style={{
              containerStyle: { width: '100%', height: '100%', borderRadius: 8 },
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">-</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-400">+</span>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {t('invite.photoPos.cancel')}
          </button>
          <button type="button" onClick={handleApply}
            className="flex-1 rounded-lg bg-sky-500 px-4 py-2.5 text-base font-semibold text-white hover:bg-sky-600 transition-colors">
            {t('invite.photoPos.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
