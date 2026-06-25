import { useT } from '../lib/i18n';

export function DmPage() {
  const t = useT();
  return (
    <div className="px-6 py-8">
      <h1 className="text-[28px] font-semibold text-navy">DM</h1>
      <p className="text-base text-muted mt-2">{t('page.dm.comingSoon')}</p>
    </div>
  );
}
