import { useEffect, useState } from 'react';
import type { RsvpFormData, RsvpHostOption, RsvpMeal } from '../types/invitation';

interface RsvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RsvpFormData) => void;
  /** 어느 분의 하객인지 선택지 — getRsvpHostOptions(wedding)로 생성해 전달 */
  hostOptions: RsvpHostOption[];
}

export function RsvpModal({ isOpen, onClose, onSubmit, hostOptions }: RsvpModalProps) {
  const [hostKey, setHostKey] = useState<string>(hostOptions[0]?.key ?? '');
  const [attendance, setAttendance] = useState<'참석' | '불참'>('참석');
  const [meal, setMeal] = useState<RsvpMeal>('yes');
  const [name, setName] = useState('');
  const [hasExtra, setHasExtra] = useState(false);
  const [extraCount, setExtraCount] = useState(0);
  const [phoneLast4, setPhoneLast4] = useState('');

  // hostOptions가 비동기로 채워지거나 바뀌면 선택값을 첫 호스트로 보정
  useEffect(() => {
    if (hostOptions.length === 0) return;
    if (!hostOptions.some((h) => h.key === hostKey)) {
      setHostKey(hostOptions[0].key);
    }
  }, [hostOptions, hostKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedHost = hostOptions.find((h) => h.key === hostKey);
    if (!selectedHost) return;
    if (name.trim().length === 0) return;

    const totalCompanion = hasExtra ? extraCount : 0;

    onSubmit({
      attendance,
      host: selectedHost,
      name: name.trim(),
      companion: totalCompanion,
      meal,
      phoneLast4: phoneLast4 || undefined,
    });
  };

  if (!isOpen) return null;

  const choiceClass = (active: boolean) =>
    `flex-1 text-center py-[13px] px-2 border rounded-[10px] text-sm font-medium cursor-pointer transition-all duration-200 ${
      active
        ? 'border-sage bg-sage text-white font-semibold'
        : 'border-sage-line bg-white text-muted hover:bg-sage-pale'
    }`;

  const stepperBtn =
    'w-7 h-7 border border-sage-line bg-white rounded-md text-sm font-bold text-sage-deep cursor-pointer font-body flex items-center justify-center leading-none transition-all duration-150 hover:bg-sage-pale active:scale-[.92]';

  const Req = () => <span className="text-required ml-0.5">*</span>;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-[4px]" onClick={onClose} />
      <div className="relative bg-white rounded-3xl max-w-[400px] w-full max-h-[88vh] overflow-y-auto px-7 pt-[34px] pb-7 shadow-[0_24px_70px_rgba(0,0,0,.3)] animate-modal-in">
        <button
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full border-none bg-sage-pale text-sage-deep text-lg cursor-pointer font-body flex items-center justify-center transition-all duration-200 hover:bg-sage hover:text-white"
          onClick={onClose}
          aria-label="닫기"
        >
          x
        </button>

        <div className="font-serif text-sm text-sage tracking-[.16em] text-center mb-1.5">
          참석 의사 전달하기
        </div>
        <h3 className="font-serif font-semibold text-xl text-ink text-center mb-2 tracking-[.02em]">
          참석 의사 체크하기
        </h3>
        <p className="text-sm text-muted text-center leading-relaxed mb-[26px]">
          한 분 한 분을 소중히 모실 수 있도록
          <br />
          참석 의사를 전해주시면 감사하겠습니다.
        </p>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {/* 어느 분의 하객 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink mb-1.5">
              어느 분의 하객이신가요?
              <Req />
            </legend>
            <div className="flex flex-wrap gap-2">
              {hostOptions.map((h) => (
                <div
                  key={h.key}
                  className={`${choiceClass(hostKey === h.key)} min-w-[calc(50%-0.25rem)]`}
                  onClick={() => setHostKey(h.key)}
                >
                  {h.role}
                </div>
              ))}
            </div>
          </fieldset>

          {/* 참석 여부 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink mb-1.5">
              참석하실 수 있나요?
              <Req />
            </legend>
            <div className="flex gap-2">
              <div className={choiceClass(attendance === '참석')} onClick={() => setAttendance('참석')}>
                참석할게요
              </div>
              <div className={choiceClass(attendance === '불참')} onClick={() => setAttendance('불참')}>
                참석이 어려워요
              </div>
            </div>
          </fieldset>

          {/* 식사 여부 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink mb-1.5">식사를 하실 예정인가요?</legend>
            <div className="flex gap-2">
              <div className={choiceClass(meal === 'yes')} onClick={() => setMeal('yes')}>
                네
              </div>
              <div className={choiceClass(meal === 'no')} onClick={() => setMeal('no')}>
                아니오
              </div>
              <div className={choiceClass(meal === 'undecided')} onClick={() => setMeal('undecided')}>
                미정
              </div>
            </div>
          </fieldset>

          {/* 성함 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink mb-1.5">
              성함이 어떻게 되시나요?
              <Req />
            </legend>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="참석자 본인 성함"
              required
              className="w-full py-[13px] px-3.5 border border-sage-line rounded-[10px] text-sm font-body text-ink bg-white focus:outline-none focus:border-sage"
            />
          </fieldset>

          {/* 추가 동행 인원 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink mb-1.5">추가 동행 인원이 있나요?</legend>
            <div className="flex gap-2">
              <div
                className={choiceClass(!hasExtra)}
                onClick={() => {
                  setHasExtra(false);
                  setExtraCount(0);
                }}
              >
                없습니다
              </div>
              <div
                className={choiceClass(hasExtra)}
                onClick={() => {
                  setHasExtra(true);
                  if (extraCount === 0) setExtraCount(1);
                }}
              >
                있습니다
              </div>
            </div>
            {hasExtra && (
              <div className="flex items-center gap-2 mt-1 ml-1">
                <button type="button" onClick={() => setExtraCount(Math.max(1, extraCount - 1))} className={stepperBtn}>
                  -
                </button>
                <span className="w-[26px] text-center text-sm font-semibold text-ink">{extraCount}</span>
                <button type="button" onClick={() => setExtraCount(extraCount + 1)} className={stepperBtn}>
                  +
                </button>
                <span className="text-sm text-muted ml-1">명</span>
              </div>
            )}
          </fieldset>

          {/* 동명이인 체크 번호 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink mb-1.5">
              동명이인 체크를 위한 번호를 알려주세요
            </legend>
            <input
              type="text"
              inputMode="numeric"
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="핸드폰 번호 뒤 4자리"
              maxLength={4}
              className="w-full py-[13px] px-3.5 border border-sage-line rounded-[10px] text-sm font-body text-ink bg-white focus:outline-none focus:border-sage"
            />
          </fieldset>

          <p className="text-sm text-muted text-center leading-relaxed">
            참석 의사를 전달해 주셔서 감사합니다.
            <br />
            결혼식 준비에 큰 도움이 됩니다. (선택 사항)
          </p>

          <button
            className="bg-sage text-white border-none py-3.5 rounded-xl text-sm font-semibold cursor-pointer font-body tracking-[.04em] transition-all duration-200 hover:bg-sage-deep"
            type="submit"
          >
            RSVP 보내기
          </button>
        </form>
      </div>
    </div>
  );
}
