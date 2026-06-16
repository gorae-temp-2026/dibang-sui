import type { WeddingData, Account } from '../types/invitation';
import { Cover } from './Cover';
import { InvitationSection } from './InvitationSection';
import { WeddingDate } from './WeddingDate';
import { Location, type MapProvider } from './Location';
import { CeremonyInfo } from './CeremonyInfo';
import { Gallery } from './Gallery';
import { Gratitude } from './Gratitude';
import { Share } from './Share';
import { Heart } from './Heart';
import { Footer } from './Footer';
import { CanvasRenderer } from './CanvasRenderer';

interface InvitationRendererProps {
  data: WeddingData;
  hideShare?: boolean;
  coverTextRef?: (el: HTMLDivElement | null) => void;
  coverLetteringRef?: (el: HTMLDivElement | null) => void;
  animPlayKey?: number;
  onEditPhoto?: (url: string) => void;
  heartSyncedCount?: number;
  onHeartTrigger?: () => void;
  onCopyAccount?: (text: string) => void;
  onCopyAddress?: (address: string) => void;
  onOpenMap?: (provider: MapProvider, address: string) => void;
  onShareKakao?: () => void;
  onCopyCurrentUrl?: () => void;
  onPayKakao?: (account: Account) => void;
  onPayToss?: (account: Account) => void;
}

type SectionKey = 'greeting' | 'weddingDate' | 'location' | 'notice' | 'gallery' | 'account' | 'canvas';

function isSectionEnabled(sectionConfig: WeddingData['sectionConfig'], key: SectionKey): boolean {
  if (!sectionConfig) return true;
  const entry = sectionConfig.find((s) => s.key === key);
  return entry ? entry.enabled : true;
}

export function InvitationRenderer({
  data,
  hideShare,
  coverTextRef,
  coverLetteringRef,
  animPlayKey,
  onEditPhoto,
  heartSyncedCount,
  onHeartTrigger,
  onCopyAccount,
  onCopyAddress,
  onOpenMap,
  onShareKakao,
  onCopyCurrentUrl,
  onPayKakao,
  onPayToss,
}: InvitationRendererProps) {
  const themeStyle: React.CSSProperties = {};
  if (data.themeColors) {
    const { background, text, accent, button } = data.themeColors;
    // 배경 → ivory(섹션 bg), pale-sky(캘린더 칸 bg)
    // 글자 → ink(본문), muted(보조 텍스트)
    // 포인트 → navy(제목·헤더·강조), line(구분선)
    // 버튼 → sky(버튼·하이라이트), soft-sky(구분바·캘린더 그라데이션)
    Object.assign(themeStyle, {
      '--color-ivory': background,
      '--color-pale-sky': background,
      '--color-ink': text,
      '--color-muted': text,
      '--color-navy': accent,
      '--color-line': accent,
      '--color-sky': button,
      '--color-soft-sky': button,
    } as React.CSSProperties);
  }
  if (data.themeFonts) {
    Object.assign(themeStyle, {
      '--font-serif': data.themeFonts.title,
      '--font-italic': data.themeFonts.subtitle,
      '--font-body': data.themeFonts.body,
    } as React.CSSProperties);
  }

  const sectionConfig = data.sectionConfig;
  const ordered = sectionConfig
    ? [...sectionConfig].sort((a, b) => a.order - b.order)
    : null;

  const renderSection = (key: SectionKey) => {
    if (!isSectionEnabled(sectionConfig, key)) return null;
    switch (key) {
      case 'greeting':
        return (
          <div key="greeting" data-section="invitation">
            <InvitationSection
              hosts={data.hosts}
              groomName={data.groomName}
              brideName={data.brideName}
              greetingMessage={data.greetingMessage}
            />
          </div>
        );
      case 'weddingDate':
        return (
          <div key="weddingDate" data-section="weddingDate">
            <WeddingDate date={data.date} />
          </div>
        );
      case 'notice':
        return (
          <div key="notice" data-section="ceremony">
            <CeremonyInfo
              groomName={data.groomName}
              brideName={data.brideName}
              date={data.date}
              hostNotice={data.hostNotice}
              couplePhotoUrl={data.coverImageUrl}
            />
          </div>
        );
      case 'gallery':
        // 섹션 구성에서 켜져 있으면 사진이 없어도 빈 갤러리(헤더)를 노출 — "체크했는데 안 보임" 혼란 방지
        return (
          <div key="gallery" data-section="gallery">
            <Gallery photos={data.galleryPhotos} photoPositions={data.photoPositions} onEditPhoto={onEditPhoto} theme={data.theme} />
          </div>
        );
      case 'location':
        return (
          <div key="location" data-section="location">
            <Location
              venueName={data.venue.name}
              venueAddress={data.venue.address}
              venueHall={data.venue.hall}
              onOpenMap={onOpenMap}
              onCopyAddress={onCopyAddress}
            />
          </div>
        );
      case 'account':
        // 섹션 구성에서 켜져 있으면 계좌가 없어도 빈 섹션(헤더)을 노출
        return (
          <div key="account" data-section="gratitude">
            <Gratitude groomAccounts={data.groomAccounts} brideAccounts={data.brideAccounts} onCopyAccount={onCopyAccount} onPayKakao={onPayKakao} onPayToss={onPayToss} />
          </div>
        );
      case 'canvas':
        // 그림판: 제목·부제목 헤더 또는 요소가 하나라도 있으면 렌더. 모두 비면 CanvasRenderer가 내부에서 null 반환.
        return data.canvasConfig ? (
          <div key="canvas" data-section="canvas">
            <CanvasRenderer config={data.canvasConfig} />
          </div>
        ) : null;
    }
  };

  return (
    <div className="bg-ivory" style={themeStyle}>
      <div data-section="cover">
        <Cover
          groomName={data.groomName}
          brideName={data.brideName}
          date={data.date}
          venueName={data.venue.name}
          venueHall={data.venue.hall}
          coverImageUrl={data.coverImageUrl}
          coverImagePosition={data.coverImagePosition}
          theme={data.theme}
          coverTextConfig={data.coverTextConfig}
          lettering={data.lettering}
          textRef={coverTextRef}
          letteringRef={coverLetteringRef}
          animPlayKey={animPlayKey}
        />
      </div>
      {ordered ? (
        ordered.map((s) => renderSection(s.key as SectionKey))
      ) : (
        <>
          {renderSection('greeting')}
          {renderSection('weddingDate')}
          {renderSection('location')}
          {renderSection('notice')}
          {renderSection('gallery')}
          {renderSection('account')}
        </>
      )}
      {!hideShare && <Share onShareKakao={onShareKakao} onCopyCurrentUrl={onCopyCurrentUrl} />}
      <Heart initialCount={data.heartCount} syncedCount={heartSyncedCount} onTrigger={onHeartTrigger} />
      <Footer />
    </div>
  );
}
