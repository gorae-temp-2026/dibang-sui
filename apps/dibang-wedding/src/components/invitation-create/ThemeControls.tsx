import { SYSTEM_FONTS, RECOMMENDED_PALETTES, type ThemeFonts, type ThemeColors } from '../../types/invitationDesignConfig';
import { FontSelect } from './FontSelect';
import { useT } from '../../lib/i18n';

interface Props {
  fonts: ThemeFonts;
  colors: ThemeColors;
  onChangeFont: (slot: 'title' | 'subtitle' | 'body', font: string) => void;
  onChangeColors: (colors: ThemeColors) => void;
}

const FONT_FIELDS: { slot: 'title' | 'subtitle' | 'body'; labelKey: string }[] = [
  { slot: 'title', labelKey: 'invite.theme.title' },
  { slot: 'subtitle', labelKey: 'invite.theme.subtitle' },
  { slot: 'body', labelKey: 'invite.theme.body' },
];

const COLOR_FIELDS: { field: keyof ThemeColors; labelKey: string }[] = [
  { field: 'background', labelKey: 'invite.theme.colorBackground' },
  { field: 'text', labelKey: 'invite.theme.body' },
  { field: 'button', labelKey: 'invite.theme.colorDecor' },
  { field: 'accent', labelKey: 'invite.theme.title' },
];

const PRESET_COLORS: Record<keyof ThemeColors, string[]> = {
  background: RECOMMENDED_PALETTES.map((p) => p.colors.background),
  text: RECOMMENDED_PALETTES.map((p) => p.colors.text),
  button: RECOMMENDED_PALETTES.map((p) => p.colors.button),
  accent: RECOMMENDED_PALETTES.map((p) => p.colors.accent),
};

export function ThemeControls({ fonts, colors, onChangeFont, onChangeColors }: Props) {
  const t = useT();
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h5 className="text-base font-medium text-gray-700">{t('invite.theme.fontHeading')}</h5>
        {FONT_FIELDS.map(({ slot, labelKey }) => (
          <div key={slot} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-base text-gray-700">{t(labelKey)}</span>
            <FontSelect
              value={fonts[slot]}
              onChange={(font) => onChangeFont(slot, font)}
              fonts={SYSTEM_FONTS}
              className="flex-1"
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h5 className="text-base font-medium text-gray-700">{t('invite.theme.colorHeading')}</h5>
        {COLOR_FIELDS.map(({ field, labelKey }) => (
          <div key={field} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-base text-gray-700">{t(labelKey)}</span>
            {PRESET_COLORS[field].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChangeColors({ ...colors, [field]: c })}
                aria-label={`${t(labelKey)} ${c}`}
                className={`w-7 h-7 shrink-0 rounded-full border-2 transition-colors ${colors[field].toLowerCase() === c.toLowerCase() ? 'border-sky-500 ring-2 ring-sky-200' : 'border-gray-200 hover:border-gray-400'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <label className="relative w-7 h-7 shrink-0 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center transition-colors" style={{ backgroundColor: colors[field] }}>
              <span className="text-white text-sm font-bold leading-none drop-shadow-[0_0_2px_rgba(0,0,0,.5)]">+</span>
              <input type="color" value={colors[field]} onChange={(e) => onChangeColors({ ...colors, [field]: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </label>
            <span className="text-sm text-gray-500 tabular-nums">{colors[field]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
