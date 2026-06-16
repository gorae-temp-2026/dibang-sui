/**
 * 브라우저에서 data URL / blob URL 을 파일로 다운로드한다.
 * 한글 파일명도 그대로 통과한다 (a.download 속성은 UTF-8 지원).
 */
export function downloadDataUrlAsFile(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/**
 * canvas 를 이미지 파일로 다운로드한다.
 * toBlob → URL.createObjectURL → anchor.click → revokeObjectURL 흐름을 캡슐화.
 */
export function downloadCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  type = 'image/png',
): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    try {
      downloadDataUrlAsFile(url, filename);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, type);
}
