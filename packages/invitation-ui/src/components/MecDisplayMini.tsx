/**
 * 식장 디지털 방명록 디스플레이(MEC)를 청첩장 안에 축소 재현한 미니어처.
 *
 * round-custom-1 시안(_prototypes/mobile-invitation/round-custom-1)의 mec-section을 이식.
 * - 세로 디스플레이 프레임 + 스탠드/받침대
 * - 화면 배경: 커버(커플) 사진
 * - 떠오르는 축하 메시지: 장식용 고정 4개 (실데이터 연동 아님)
 * - 유리판 가짜 QR: v3 ChukuihamQR의 유리판 톤을 차용한 장식 (실 weddingId QR 아님)
 *
 * 메시지/QR이 모두 "장식"인 이유: 이 섹션은 식장에 가기 전에 보는 안내라 실데이터가 없다.
 * 글씨가 7px/6px로 매우 작은 것은 디바이스 목업 내부의 장식 텍스트라 의도된 것(읽기용 본문 아님).
 */

// 떠오르는 축하 메시지 — 장식용 고정값. 이름은 마스킹 예시.
const DECO_MESSAGES = [
  { text: '결혼 축하해요! 행복하세요', name: '김*준', left: '5px', delay: '0s' },
  { text: '두 분의 앞날을 축복합니다', name: '이*영', left: '30px', delay: '2.5s' },
  { text: '항상 함께 웃는 가정 되세요', name: '박*수', left: '10px', delay: '5s' },
  { text: '사랑 가득한 날 되세요', name: '최*은', left: '35px', delay: '1.2s' },
];

interface MecDisplayMiniProps {
  /** 화면 배경에 깔 커플(커버) 사진 */
  couplePhotoUrl?: string;
}

export function MecDisplayMini({ couplePhotoUrl }: MecDisplayMiniProps) {
  return (
    <div className="w-[130px] mx-auto mb-6 relative">
      {/* mecFloat: 아래에서 위로 떠오르며 페이드. self-contained라 소비앱 Tailwind 설정 불필요 */}
      <style>{`
        @keyframes mecFloat {
          0%   { transform: translateY(0);      opacity: 0; }
          8%   { opacity: 1; }
          80%  { opacity: 1; }
          95%  { opacity: 0; }
          100% { transform: translateY(-250px); opacity: 0; }
        }
      `}</style>

      {/* 디스플레이 프레임 (세로 9:16, 검은 베젤) */}
      <div
        className="w-full aspect-[9/16] rounded-[12px] overflow-hidden relative bg-[#1a1a1a]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 0 0 3px #2a2a2a' }}
      >
        {couplePhotoUrl && (
          <img src={couplePhotoUrl} alt="" className="w-full h-full object-cover opacity-70" />
        )}

        <div className="absolute inset-0 overflow-hidden">
          {/* 떠오르는 축하 메시지 (장식) */}
          <div className="absolute inset-0 z-[1]">
            {DECO_MESSAGES.map((m, i) => (
              <div
                key={i}
                className="absolute text-left w-max max-w-[100px] rounded-[7px] px-2 py-[5px] opacity-0"
                style={{
                  bottom: '-60px',
                  left: m.left,
                  fontFamily: "'Noto Serif KR', serif",
                  background: 'rgba(60, 45, 8, 0.55)',
                  border: '1px solid rgba(200, 160, 60, 0.22)',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
                  animation: 'mecFloat 8s linear infinite',
                  animationDelay: m.delay,
                }}
              >
                <div
                  style={{
                    fontSize: '7px',
                    color: 'rgba(255, 250, 244, 0.92)',
                    lineHeight: 1.5,
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                  }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    fontSize: '6px',
                    color: 'rgba(255, 248, 240, 0.50)',
                    marginTop: '2px',
                    letterSpacing: '0.5px',
                    fontFamily: "'Noto Sans KR', sans-serif",
                  }}
                >
                  {m.name}
                </div>
              </div>
            ))}
          </div>

          {/* 유리판 가짜 QR (v3 ChukuihamQR 유리판 톤 차용) */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-[2] flex items-center justify-center"
            style={{
              bottom: '25%',
              width: '35px',
              height: '35px',
              padding: '4px',
              background: 'rgba(60, 45, 8, 0.45)',
              backdropFilter: 'blur(20px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
              border: '1px solid rgba(200, 160, 60, 0.25)',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,160,60,0.06)',
            }}
          >
            <svg viewBox="0 0 21 21" fill="rgba(255,250,244,0.80)" className="w-full h-full" aria-hidden="true">
              {/* top-left finder */}
              <rect x="0" y="0" width="7" height="1" /><rect x="0" y="6" width="7" height="1" /><rect x="0" y="0" width="1" height="7" /><rect x="6" y="0" width="1" height="7" /><rect x="2" y="2" width="3" height="3" />
              {/* top-right finder */}
              <rect x="14" y="0" width="7" height="1" /><rect x="14" y="6" width="7" height="1" /><rect x="14" y="0" width="1" height="7" /><rect x="20" y="0" width="1" height="7" /><rect x="16" y="2" width="3" height="3" />
              {/* bottom-left finder */}
              <rect x="0" y="14" width="7" height="1" /><rect x="0" y="20" width="7" height="1" /><rect x="0" y="14" width="1" height="7" /><rect x="6" y="14" width="1" height="7" /><rect x="2" y="16" width="3" height="3" />
              {/* timing */}
              <rect x="8" y="6" width="1" height="1" /><rect x="10" y="6" width="1" height="1" /><rect x="12" y="6" width="1" height="1" /><rect x="6" y="8" width="1" height="1" /><rect x="6" y="10" width="1" height="1" /><rect x="6" y="12" width="1" height="1" />
              {/* data dots */}
              <rect x="8" y="0" width="1" height="1" /><rect x="10" y="1" width="1" height="1" /><rect x="12" y="0" width="1" height="1" /><rect x="9" y="2" width="1" height="1" /><rect x="11" y="3" width="1" height="1" /><rect x="8" y="4" width="1" height="1" /><rect x="10" y="4" width="1" height="1" /><rect x="12" y="5" width="1" height="1" />
              <rect x="8" y="8" width="1" height="1" /><rect x="10" y="8" width="1" height="1" /><rect x="9" y="9" width="1" height="1" /><rect x="11" y="9" width="1" height="1" /><rect x="8" y="10" width="1" height="1" /><rect x="10" y="10" width="1" height="1" /><rect x="12" y="10" width="1" height="1" /><rect x="9" y="11" width="1" height="1" /><rect x="11" y="11" width="1" height="1" /><rect x="8" y="12" width="1" height="1" /><rect x="10" y="12" width="1" height="1" />
              <rect x="14" y="8" width="1" height="1" /><rect x="16" y="8" width="1" height="1" /><rect x="18" y="9" width="1" height="1" /><rect x="15" y="10" width="1" height="1" /><rect x="17" y="10" width="1" height="1" /><rect x="19" y="11" width="1" height="1" /><rect x="14" y="12" width="1" height="1" /><rect x="16" y="12" width="1" height="1" /><rect x="20" y="12" width="1" height="1" />
              <rect x="8" y="14" width="1" height="1" /><rect x="10" y="14" width="1" height="1" /><rect x="12" y="15" width="1" height="1" /><rect x="9" y="16" width="1" height="1" /><rect x="11" y="16" width="1" height="1" /><rect x="8" y="18" width="1" height="1" /><rect x="10" y="18" width="1" height="1" /><rect x="12" y="19" width="1" height="1" /><rect x="9" y="20" width="1" height="1" /><rect x="11" y="20" width="1" height="1" />
              <rect x="14" y="14" width="1" height="1" /><rect x="16" y="15" width="1" height="1" /><rect x="18" y="14" width="1" height="1" /><rect x="20" y="15" width="1" height="1" /><rect x="15" y="16" width="1" height="1" /><rect x="17" y="17" width="1" height="1" /><rect x="19" y="16" width="1" height="1" /><rect x="14" y="18" width="1" height="1" /><rect x="16" y="19" width="1" height="1" /><rect x="18" y="20" width="1" height="1" /><rect x="20" y="18" width="1" height="1" />
            </svg>
          </div>
        </div>
      </div>

      {/* 스탠드 + 받침대 */}
      <div
        className="mx-auto"
        style={{ width: '6px', height: '28px', background: 'linear-gradient(to bottom, #2a2a2a, #444)', borderRadius: '0 0 2px 2px' }}
      />
      <div
        className="mx-auto"
        style={{ width: '44px', height: '5px', background: 'linear-gradient(to bottom, #444, #333)', borderRadius: '3px' }}
      />
    </div>
  );
}
