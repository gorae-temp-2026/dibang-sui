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
import { SECTION_LABELS, REQUIRED_SECTIONS, type SectionEntry } from '../../types/invitationDesignConfig';
import { useT } from '../../lib/i18n';

interface Props {
  sections: SectionEntry[];
  onChange: (sections: SectionEntry[]) => void;
}

interface SortableItemProps {
  entry: SectionEntry;
  required: boolean;
  onToggle: (key: SectionEntry['key']) => void;
}

// 한 섹션 행 = 정렬 가능한 항목. 드래그는 핸들(햄버거)에만 걸어 체크박스 클릭과 분리한다.
function SortableItem({ entry, required, onToggle }: SortableItemProps) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3.5 transition-colors hover:border-gray-300 cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? 'opacity-80 shadow-lg z-10 scale-[1.02]' : ''
      }`}
    >
      <span className="text-gray-400 shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="checkbox"
        checked={entry.enabled}
        disabled={required}
        onChange={() => onToggle(entry.key)}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-300 disabled:opacity-50 shrink-0"
      />
      <span className="flex-1 text-base text-gray-700">
        {SECTION_LABELS[entry.key].name}
        <span className="text-gray-400 ml-1">({SECTION_LABELS[entry.key].sub})</span>
      </span>
      {required && <span className="text-base text-sky-600 shrink-0">{t('invite.required')}</span>}
    </li>
  );
}

export function SectionControls({ sections, onChange }: Props) {
  const ordered = [...sections].sort((a, b) => a.order - b.order);

  // PointerSensor distance 5px: 터치 탭과 드래그를 구분(짧은 탭은 드래그로 보지 않음).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggle = (key: SectionEntry['key']) => {
    if (REQUIRED_SECTIONS.includes(key)) return;
    onChange(sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((s) => s.key === active.id);
    const newIndex = ordered.findIndex((s) => s.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(ordered, oldIndex, newIndex);
    onChange(reordered.map((s, i) => ({ ...s, order: i })));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map((s) => s.key)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {ordered.map((s) => (
            <SortableItem
              key={s.key}
              entry={s}
              required={REQUIRED_SECTIONS.includes(s.key)}
              onToggle={toggle}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
