import QRCode from 'qrcode';
import { downloadCanvasAsImage } from './download-canvas';

/**
 * canvas 에 QR 코드를 그린다. QRCode.toCanvas 래퍼.
 * (UI/데이터 분리 P2-1: WeddingCard 내부 직접 호출을 lib으로 분리)
 */
export function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  url: string,
  opts: { width?: number; margin?: number } = {},
): void {
  QRCode.toCanvas(canvas, url, { width: opts.width ?? 200, margin: opts.margin ?? 2 });
}

/**
 * QR canvas 를 PNG 파일로 다운로드.
 */
export function downloadQrAsPng(canvas: HTMLCanvasElement, filename: string): void {
  downloadCanvasAsImage(canvas, filename);
}
