import { useState } from 'react';
import { useInvitationForm, DEFAULT_GREETING } from '../../hooks/invitation-create/useInvitationForm';
import type { HostRole } from '../../hooks/invitation-create/useInvitationForm';
import { REQUIRED_SECTIONS, type SectionKey } from '../../types/invitationDesignConfig';
import type { InvitationUploadItem } from '../../machines/invitationImageUpload.machine';
import type { InvitationUploadContext } from '../../queries/invitation/useInvitationPhotoUpload';
import type { InvitationTheme } from '@gorae/invitation-ui';
import { invitationThemes } from '../../lib/theme';
import { AccountEditor } from './AccountEditor';
import { CoverImageUploader } from './CoverImageUploader';
import { GalleryUploader } from './GalleryUploader';
import { LetteringControls } from './LetteringControls';
import { SectionControls } from './SectionControls';
import { ThemeControls } from './ThemeControls';
import { CanvasEditor } from './CanvasEditor';
import { inputClass, inputErrorClass, sectionTitleClass, requiredMark, errorMessage, slugStatusConfig } from './styles';
import type { SlugAvailability } from '../../queries/invitation/useSlugAvailability';
import { openDaumPostcode } from '../../lib/daum-postcode';

// 에디터 설정 카드의 탭 칩 스타일 — 레터링 모드 선택 칩과 동일 디자인
const chipBase = 'rounded-lg border px-3 py-2 text-base font-medium transition-colors';
const chipActive = 'border-sky-400 bg-sky-50 text-sky-700';
const chipIdle = 'border-gray-200 bg-white text-gray-600 hover:border-gray-300';
const chip = (active: boolean) => `${chipBase} ${active ? chipActive : chipIdle}`;

/**
 * EditPanel — 중간 컨테이너. 폼 zustand store(클라이언트 state)는 직접 쓰되,
 * 데이터 mutation(이미지 업로드 등)은 상위 page가 흘려보낸 props로 위젯에 주입.
 * (UI/데이터 분리 2-G)
 */
interface EditPanelProps {
  title?: string;
  invitationOnly?: boolean;
  onFocusSection?: (section: string) => void;
  onPlayAnimation?: () => void;
  /** 업로드 스코프 — Edit: wedding, Create: draft (레터링 업로드에 전달) */
  uploadContext: InvitationUploadContext;
  onPickCover: (file: File) => void;
  coverItem?: InvitationUploadItem;
  onRetryCover: () => void;
  onRemoveCoverItem: () => void;
  onAddGalleryPhotos: (files: File[]) => void;
  galleryItems: InvitationUploadItem[];
  onRetryGalleryItem: (id: string) => void;
  onRemoveGalleryItem: (id: string) => void;
  onUploadImage: (file: File) => Promise<string | null>;
  /** Edit 전용: slug 입력 카드 표시 + 가용성(page가 useSlugCheck로 주입). 없으면(Create) 미표시. */
  slugAvailability?: SlugAvailability;
}

export function EditPanel({
  title = '청첩장 만들기',
  invitationOnly = false,
  onFocusSection,
  onPlayAnimation,
  uploadContext,
  onPickCover,
  coverItem,
  onRetryCover,
  onRemoveCoverItem,
  onAddGalleryPhotos,
  galleryItems,
  onRetryGalleryItem,
  onRemoveGalleryItem,
  onUploadImage,
  slugAvailability,
}: EditPanelProps) {
  const store = useInvitationForm();
  const [configTab, setConfigTab] = useState<'sections' | 'design'>('sections');

  // 섹션 구성에서 꺼진 섹션은 에디터에서도 흐리게 + 편집 불가 처리 (미리보기 isSectionEnabled와 일관)
  const offClass = (key: SectionKey) =>
    store.designConfig.sections.find((s) => s.key === key)?.enabled === false
      ? 'opacity-40 pointer-events-none'
      : '';

  const sectionEnabled = (key: SectionKey) =>
    store.designConfig.sections.find((s) => s.key === key)?.enabled !== false;

  // 비활성 섹션 카드는 어둡게(회색 배경) — 콘텐츠는 offClass로 흐릿+편집불가, 헤더 체크박스는 크리스프 유지.
  // bg를 상호배타로 반환해 bg-white와의 순서 의존 제거.
  const cardOffClass = (key: SectionKey) => (sectionEnabled(key) ? 'bg-white' : 'bg-gray-100');

  const toggleSection = (key: SectionKey) => {
    if (REQUIRED_SECTIONS.includes(key)) return;
    store.setSections(
      store.designConfig.sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  // 섹션 카드 헤더: 제목 + 인라인 활성 체크박스(필수는 disabled). 헤더는 항상 클릭 가능 — offClass는 콘텐츠에만 적용.
  const sectionCardHeader = (title: string, key: SectionKey) => {
    const required = REQUIRED_SECTIONS.includes(key);
    return (
      <div className="flex items-center justify-between">
        <h2 className={sectionTitleClass}>{title}</h2>
        <label className="flex items-center gap-1.5 text-base text-gray-500 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={sectionEnabled(key)}
            disabled={required}
            onChange={() => toggleSection(key)}
            aria-label={`${title} 섹션 표시`}
            className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-300 disabled:opacity-50"
          />
          {required && <span className="text-sky-600">필수</span>}
        </label>
      </div>
    );
  };

  return (
    <div className="overflow-y-auto h-full p-6 space-y-6 bg-gray-50">
      <h1 className="text-[28px] font-semibold text-gray-900">{title}</h1>

      {/* 카드: 공유 링크(slug) — Edit 전용. 중복검증은 page가 useSlugCheck로 주입(머신 slug 병렬). */}
      {slugAvailability !== undefined && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <h2 className={sectionTitleClass}>공유 링크</h2>
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-400">gorae.com/</span>
            <input
              type="text"
              placeholder="my-wedding"
              value={store.slug}
              onChange={(e) => store.setField('slug', e.target.value)}
              className={`flex-1 ${inputClass}`}
            />
          </div>
          {slugStatusConfig[slugAvailability].text && (
            <p className={`text-sm ${slugStatusConfig[slugAvailability].color}`}>
              {slugStatusConfig[slugAvailability].text}
            </p>
          )}
        </div>
      )}

      {/* 카드: 에디터 설정 (섹션 구성 + 디자인 설정 탭) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className={sectionTitleClass}>에디터 설정</h2>
        <div className="flex gap-2">
          <button type="button" className={chip(configTab === 'sections')} onClick={() => setConfigTab('sections')}>
            섹션 구성
          </button>
          <button type="button" className={chip(configTab === 'design')} onClick={() => setConfigTab('design')}>
            디자인 설정
          </button>
        </div>
        {configTab === 'sections' && (
          <SectionControls sections={store.designConfig.sections} onChange={store.setSections} />
        )}
        {configTab === 'design' && (
          <ThemeControls
            fonts={store.designConfig.theme.fonts}
            colors={store.designConfig.theme.colors}
            onChangeFont={store.setThemeFontSlot}
            onChangeColors={store.setThemeColors}
          />
        )}
      </div>

      {/* 카드: 디자인 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-6">

      {/* 테마 선택 — QA 2026-05-29: 일단 숨김(기본 'moi-pink' 고정, 추후 복원 예정). */}
      {/* eslint-disable-next-line no-constant-binary-expression -- 의도적 토글(false=숨김, 추후 복원) */}
      {false && (
      <section className="space-y-4">
        <h2 className={sectionTitleClass}>테마</h2>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(invitationThemes) as [InvitationTheme, typeof invitationThemes[InvitationTheme]][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => store.setField('theme', key)}
              className={`rounded-lg border px-4 py-3 flex items-center gap-3 transition-colors ${
                store.theme === key
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span
                className="w-6 h-6 rounded-full shrink-0 border border-gray-200"
                style={{ background: `linear-gradient(135deg, ${cfg.colors.previewBg}, ${cfg.colors.previewText})` }}
              />
              <span className={`text-base font-medium ${
                store.theme === key ? 'text-sky-700' : 'text-gray-600'
              }`}>
                {cfg.label}
              </span>
            </button>
          ))}
        </div>
      </section>
      )}

      {/* 커버 이미지 */}
      <div onClick={() => onFocusSection?.('cover')}>
        <CoverImageUploader
          item={coverItem}
          onPickFile={onPickCover}
          onRetry={onRetryCover}
          onRemoveItem={onRemoveCoverItem}
        />
      </div>

      {/* 레터링 (텍스트 입력 · 직접 그리기 · 이미지 업로드) — 커버 위에 오버레이 */}
      <section className="space-y-4" onFocus={() => onFocusSection?.('cover')}>
        <h2 className={sectionTitleClass}>레터링</h2>
        <LetteringControls
          uploadContext={uploadContext}
          source={store.designConfig.lettering.source}
          imageUrl={store.designConfig.lettering.imageUrl}
          strokes={store.designConfig.lettering.strokes}
          drawViewBox={store.designConfig.lettering.drawViewBox}
          animation={store.designConfig.lettering.animation}
          coverText={store.coverTextConfig.text}
          coverTextAnimation={store.coverTextConfig.animation}
          coverTextColorType={store.coverTextConfig.colorType}
          coverTextSolidColor={store.coverTextConfig.solidColor}
          coverTextGradientColors={store.coverTextConfig.gradientColors}
          onChangeSource={store.setLetteringSource}
          onChangeImage={(url) => store.setLettering({ ...store.designConfig.lettering, imageUrl: url })}
          onChangeStrokes={(strokes) => store.setLettering({ ...store.designConfig.lettering, strokes })}
          onChangeAnimation={(a) => store.setLettering({ ...store.designConfig.lettering, animation: a })}
          onChangeCoverText={(text) => store.setField('coverTextConfig', { ...store.coverTextConfig, text })}
          onChangeCoverTextAnimation={(a) => store.setField('coverTextConfig', { ...store.coverTextConfig, animation: a })}
          onChangeCoverTextColorType={(t) => store.setField('coverTextConfig', { ...store.coverTextConfig, colorType: t })}
          onChangeCoverTextSolidColor={(c) => store.setField('coverTextConfig', { ...store.coverTextConfig, solidColor: c })}
          onChangeCoverTextGradientColors={(c) => store.setField('coverTextConfig', { ...store.coverTextConfig, gradientColors: c })}
          onPlayAnimation={onPlayAnimation}
        />
      </section>
      </div>

      {!invitationOnly && <>
      {/* 카드: 나의 역할 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <section className="space-y-4" onFocus={() => onFocusSection?.('cover')}>
        <h2 className={sectionTitleClass}>나의 역할 <span className="text-red-400">*</span></h2>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['groom', '신랑'],
            ['bride', '신부'],
          ] as [HostRole, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => store.setField('myRole', value)}
              className={`rounded-lg border px-4 py-3 text-base font-medium transition-colors ${
                store.myRole === value
                  ? 'border-sky-400 bg-sky-50 text-sky-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      </div>

      {/* 카드: 신랑 측 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <section className="space-y-4" onFocus={() => onFocusSection?.('invitation')}>
        <h2 className={sectionTitleClass}>신랑 측 정보</h2>
        <div>
          <label className="text-base font-medium text-gray-700 mb-1 block">신랑님 <span className="text-red-400">*</span></label>
          <input type="text" placeholder="이름" value={store.groomName}
            onChange={(e) => store.setField('groomName', e.target.value)} className={store.errors.has('groomName') ? inputErrorClass : inputClass} />
          {store.errors.has('groomName') && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
        </div>
        <div>
          <label className="text-base font-medium text-gray-700 mb-1 block">신랑 아버님</label>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="성함" value={store.groomFatherName}
              onChange={(e) => store.setField('groomFatherName', e.target.value)} className={`flex-1 ${inputClass}`} />
            <label className="flex items-center gap-1.5 text-base text-gray-500 shrink-0 cursor-pointer">
              <input type="checkbox" checked={store.groomFatherDeceased}
                onChange={(e) => store.setField('groomFatherDeceased', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-gray-400 focus:ring-gray-300" />
              고인
            </label>
          </div>
        </div>
        <div>
          <label className="text-base font-medium text-gray-700 mb-1 block">신랑 어머님</label>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="성함" value={store.groomMotherName}
              onChange={(e) => store.setField('groomMotherName', e.target.value)} className={`flex-1 ${inputClass}`} />
            <label className="flex items-center gap-1.5 text-base text-gray-500 shrink-0 cursor-pointer">
              <input type="checkbox" checked={store.groomMotherDeceased}
                onChange={(e) => store.setField('groomMotherDeceased', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-gray-400 focus:ring-gray-300" />
              고인
            </label>
          </div>
        </div>
      </section>
      </div>

      {/* 카드: 신부 측 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <section className="space-y-4" onFocus={() => onFocusSection?.('invitation')}>
        <h2 className={sectionTitleClass}>신부 측 정보</h2>
        <div>
          <label className="text-base font-medium text-gray-700 mb-1 block">신부님 <span className="text-red-400">*</span></label>
          <input type="text" placeholder="이름" value={store.brideName}
            onChange={(e) => store.setField('brideName', e.target.value)} className={store.errors.has('brideName') ? inputErrorClass : inputClass} />
          {store.errors.has('brideName') && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
        </div>
        <div>
          <label className="text-base font-medium text-gray-700 mb-1 block">신부 아버님</label>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="성함" value={store.brideFatherName}
              onChange={(e) => store.setField('brideFatherName', e.target.value)} className={`flex-1 ${inputClass}`} />
            <label className="flex items-center gap-1.5 text-base text-gray-500 shrink-0 cursor-pointer">
              <input type="checkbox" checked={store.brideFatherDeceased}
                onChange={(e) => store.setField('brideFatherDeceased', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-gray-400 focus:ring-gray-300" />
              고인
            </label>
          </div>
        </div>
        <div>
          <label className="text-base font-medium text-gray-700 mb-1 block">신부 어머님</label>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="성함" value={store.brideMotherName}
              onChange={(e) => store.setField('brideMotherName', e.target.value)} className={`flex-1 ${inputClass}`} />
            <label className="flex items-center gap-1.5 text-base text-gray-500 shrink-0 cursor-pointer">
              <input type="checkbox" checked={store.brideMotherDeceased}
                onChange={(e) => store.setField('brideMotherDeceased', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-gray-400 focus:ring-gray-300" />
              고인
            </label>
          </div>
        </div>
      </section>
      </div>

      {/* 카드: 예식 일시 (weddingDate) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      {sectionCardHeader('예식 일시', 'weddingDate')}
      <div className={`space-y-4 ${offClass('weddingDate')}`} onFocus={() => onFocusSection?.('weddingDate')}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-base text-gray-700 mb-1 block">날짜</label>
            <input type="date" value={store.date}
              onChange={(e) => store.setField('date', e.target.value)} className={store.errors.has('date') ? inputErrorClass : inputClass} />
            {store.errors.has('date') && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
          </div>
          <div>
            <label className="text-base text-gray-700 mb-1 block">시간</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={store.time ? store.time.split(':')[0] : ''}
                onChange={(e) => {
                  const m = store.time ? store.time.split(':')[1] : '00';
                  store.setField('time', `${e.target.value}:${m}`);
                }}
                className={store.errors.has('time') ? inputErrorClass : inputClass}
              >
                <option value="">시</option>
                {Array.from({ length: 17 }, (_, i) => i + 7).map((h) => (
                  <option key={h} value={String(h).padStart(2, '0')}>{h}시</option>
                ))}
              </select>
              <select
                value={store.time ? store.time.split(':')[1] : ''}
                onChange={(e) => {
                  const h = store.time ? store.time.split(':')[0] : '12';
                  store.setField('time', `${h}:${e.target.value}`);
                }}
                className={store.errors.has('time') ? inputErrorClass : inputClass}
              >
                <option value="">분</option>
                {Array.from({ length: 6 }, (_, i) => String(i * 10).padStart(2, '0')).map((m) => (
                  <option key={m} value={m}>{m}분</option>
                ))}
              </select>
            </div>
            {store.errors.has('time') && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
          </div>
        </div>
      </div>
      </div>

      {/* 카드: 예식장 (location) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      {sectionCardHeader('예식장', 'location')}
      <div className={`space-y-4 ${offClass('location')}`} onFocus={() => onFocusSection?.('location')}>
        <div>
          <label className="text-base text-gray-700 mb-1 block">주소</label>
          <div className="flex items-center gap-2">
            <input type="text" placeholder={"예식장 주소를 입력하세요" + requiredMark} value={store.venueAddress}
              onChange={(e) => store.setField('venueAddress', e.target.value)} className={`flex-1 ${store.errors.has('venueAddress') ? inputErrorClass : inputClass}`} readOnly />
            <button
              type="button"
              onClick={() => {
                openDaumPostcode((data) => {
                  store.setField('venueAddress', data.roadAddress || data.jibunAddress || '');
                });
              }}
              className="shrink-0 rounded-lg bg-gray-100 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              주소 검색
            </button>
          </div>
          {store.errors.has('venueAddress') && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
        </div>
        <div>
          <label className="text-base text-gray-700 mb-1 block">예식장 이름</label>
          <input type="text" placeholder={"예식장 이름을 입력하세요" + requiredMark} value={store.venueName}
            onChange={(e) => store.setField('venueName', e.target.value)} className={store.errors.has('venueName') ? inputErrorClass : inputClass} />
          {store.errors.has('venueName') && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
        </div>
        <div>
          <label className="text-base text-gray-700 mb-1 block">층과 홀 (선택)</label>
          <input type="text" placeholder="예: 그랜드볼룸홀 2층" value={store.venueHall}
            onChange={(e) => store.setField('venueHall', e.target.value)} className={inputClass} />
        </div>
      </div>
      </div>

      {/* 카드: 인사말 (greeting) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      {sectionCardHeader('인사말', 'greeting')}
      <div className={`space-y-4 ${offClass('greeting')}`} onFocus={() => onFocusSection?.('invitation')}>
        <textarea
          placeholder={DEFAULT_GREETING}
          value={store.customMessage}
          onChange={(e) => store.setField('customMessage', e.target.value)}
          rows={7}
          className={`${inputClass} resize-none`}
        />
      </div>
      </div>

      {/* 카드: 축의금 계좌 정보 (account) */}
      <div className={`rounded-2xl border border-gray-200 p-5 space-y-4 ${cardOffClass('account')}`}>
      {sectionCardHeader('축의금 계좌 정보', 'account')}
      <div className={`space-y-4 ${offClass('account')}`} onFocus={() => onFocusSection?.('gratitude')}>
        <AccountEditor label="신랑측" slots={store.groomAccounts} side="groom" />
        <AccountEditor label="신부측" slots={store.brideAccounts} side="bride" />
      </div>
      </div>

      {/* 카드: 안내사항 (notice) */}
      <div className={`rounded-2xl border border-gray-200 p-5 space-y-4 ${cardOffClass('notice')}`}>
      {sectionCardHeader('안내사항', 'notice')}
      <div className={`space-y-4 ${offClass('notice')}`} onFocus={() => onFocusSection?.('ceremony')}>
        <textarea
          placeholder="하객에게 전할 안내사항 (예: 주차 안내, 복장 코드 등)"
          value={store.hostNotice}
          onChange={(e) => store.setField('hostNotice', e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>
      </div>
      </>}

      {/* 카드: 갤러리 (gallery) — 양 모드 공통 */}
      <div className={`rounded-2xl border border-gray-200 p-5 space-y-4 ${cardOffClass('gallery')}`}>
      {sectionCardHeader('갤러리', 'gallery')}
      <div className={offClass('gallery')} onFocus={() => onFocusSection?.('gallery')}>
        <GalleryUploader
          items={galleryItems}
          onPickFiles={onAddGalleryPhotos}
          onRetryItem={onRetryGalleryItem}
          onRemoveItem={onRemoveGalleryItem}
        />
      </div>
      </div>

      {/* 카드: 그림판 (canvas) — 양 모드 공통 */}
      <div className={`rounded-2xl border border-gray-200 p-5 space-y-4 ${cardOffClass('canvas')}`} onClick={() => onFocusSection?.('canvas')}>
      {sectionCardHeader('그림판', 'canvas')}
      <div className={offClass('canvas')}>
        <CanvasEditor
          config={store.canvasConfig}
          onChange={store.setCanvasConfig}
          onUploadImage={onUploadImage}
        />
      </div>
      </div>

    </div>
  );
}
