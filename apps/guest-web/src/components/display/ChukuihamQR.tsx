import { useEffect, useRef } from 'react'
import QRCodeStyling from 'qr-code-styling'

const QR_SIZE = 150
const LOGO_SIZE = 32

export function ChukuihamQR({ qrUrl }: { qrUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling({
        width: QR_SIZE,
        height: QR_SIZE,
        data: qrUrl,
        type: 'svg',
        dotsOptions: {
          type: 'rounded',
          color: '#FFFFFF',
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#FFFFFF',
        },
        cornersDotOptions: {
          type: 'dot',
          color: '#FFFFFF',
        },
        backgroundOptions: {
          color: 'rgba(60, 45, 8, 0.8)',
          round: 0.1,
        },
        qrOptions: {
          errorCorrectionLevel: 'Q',
        },
        image: '/chuk-logo.svg',
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 4,
          imageSize: LOGO_SIZE / QR_SIZE,
        },
      })
      qrRef.current.append(containerRef.current)
    } else {
      qrRef.current.update({ data: qrUrl })
    }
  }, [qrUrl])

  return (
    <div
      className="flex items-center justify-center px-4 py-4"
      style={{
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        background: 'rgba(60, 45, 8, 0.45)',
        border: '1px solid rgba(200, 160, 60, 0.25)',
        borderRadius: 24,
        boxShadow: '0 10px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,160,60,0.06)',
      }}
    >
      <div ref={containerRef} />
    </div>
  )
}
