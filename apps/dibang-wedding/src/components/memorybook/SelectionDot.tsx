import { useT } from '../../lib/i18n';

interface SelectionDotProps {
  selected: boolean;
  selectionIndex: number;
  onClick: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

export function SelectionDot({ selected, selectionIndex, onClick, size = 'sm' }: SelectionDotProps) {
  const t = useT();
  const dim = size === 'md' ? 36 : 26;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={selected ? t('memorybook.deselect') : t('memorybook.select')}
      className="absolute top-1.5 right-1.5 -m-2.5 flex h-[46px] w-[46px] items-center justify-center bg-transparent p-0 border-0"
    >
      <span
        style={{ width: dim, height: dim }}
        className={`flex items-center justify-center rounded-full text-white text-[13px] font-semibold shadow-sm ${
          selected ? 'bg-stone-900' : 'border-2 border-white/90 bg-black/25'
        }`}
      >
        {selected ? selectionIndex + 1 : ''}
      </span>
    </button>
  );
}
