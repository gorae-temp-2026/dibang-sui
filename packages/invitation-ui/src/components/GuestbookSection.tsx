import { useState } from 'react';
import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';
import { useT } from '../lib/i18n';

interface GuestbookEntry {
  id: string;
  guest_name: string;
  message: string;
  created_at: string;
}

interface GuestbookSectionProps {
  entries: GuestbookEntry[];
  hasMore: boolean;
  onLoadMore: () => void;
  onSubmit: (name: string, message: string) => void;
  isSubmitting?: boolean;
  isLoadingMore?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function EntryCard({ entry }: { entry: GuestbookEntry }) {
  return (
    <div className="border-b border-line/50 py-4 last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-semibold text-navy">{entry.guest_name}</span>
        <span className="text-sm text-muted">{formatDate(entry.created_at)}</span>
      </div>
      <p className="text-base text-navy/80 leading-relaxed whitespace-pre-wrap">{entry.message}</p>
    </div>
  );
}

function WriteForm({ onSubmit, isSubmitting }: { onSubmit: (name: string, message: string) => void; isSubmitting?: boolean }) {
  const t = useT();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !message.trim()) return;
    onSubmit(name.trim(), message.trim());
    setName('');
    setMessage('');
  };

  return (
    <div className="mt-6 space-y-3">
      <input
        type="text"
        placeholder={t('invitationUi.guestbook.namePlaceholder')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        className="w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-soft-sky"
      />
      <textarea
        placeholder={t('invitationUi.guestbook.messagePlaceholder')}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={500}
        rows={3}
        className="w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-navy placeholder:text-muted/60 resize-none focus:outline-none focus:ring-2 focus:ring-soft-sky"
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{message.length}/500</span>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim() || !message.trim()}
          className="rounded-xl bg-navy px-6 py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t('invitationUi.guestbook.submitting') : t('invitationUi.guestbook.submit')}
        </button>
      </div>
    </div>
  );
}

export function GuestbookSection({ entries, hasMore, onLoadMore, onSubmit, isSubmitting, isLoadingMore }: GuestbookSectionProps) {
  const ref = useIntersectionFadeIn<HTMLElement>();
  const t = useT();

  return (
    <section
      ref={ref}
      className="px-7 py-10 opacity-0 translate-y-8 transition-all duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
    >
      <h2 className="font-serif text-xl text-navy text-center mb-6">{t('invitationUi.guestbook.title')}</h2>

      {entries.length === 0 && (
        <p className="text-base text-muted text-center py-6">
          {t('invitationUi.guestbook.empty')}
        </p>
      )}

      <div>
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="w-full mt-4 py-3 text-base text-muted hover:text-navy transition-colors disabled:opacity-50"
        >
          {isLoadingMore ? t('invitationUi.guestbook.loading') : t('invitationUi.guestbook.loadMore')}
        </button>
      )}

      <WriteForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
    </section>
  );
}
