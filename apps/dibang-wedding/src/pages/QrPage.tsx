// 바텀 네비 'QR' 탭 = 현장에서 하객 QR을 읽는 '스캐너' 화면.
// 결혼식/축의대 QR '이미지를 표시'하는 자리가 아니라, 카메라 스캐너가 들어갈 자리다.
// TODO(구현 예정): 카메라 기반 현장 QR 스캐너 연동.

export function QrPage() {
  return (
    <div className="px-6 py-8">
      <h1 className="text-[28px] font-semibold text-navy mb-6">QR 스캔</h1>

      {/* (구현 예정) 현장 QR 스캐너 — 카메라 스캐너가 이 자리에 들어갑니다. */}
      <div className="rounded-2xl border border-dashed border-line bg-white py-20 text-center">
        <p className="text-base font-semibold text-gray-900">QR 스캐너 (구현 예정)</p>
        <p className="text-sm text-muted mt-2">
          현장에서 하객 QR을 스캔하는 기능이 이 자리에 들어갑니다.
        </p>
      </div>
    </div>
  );
}
