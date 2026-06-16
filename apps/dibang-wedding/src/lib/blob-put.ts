// XHR 기반 PUT (진행률 콜백 지원).
// UI/데이터 분리 P3-1: lib/presignedUpload.ts에서 분리.
//
// fetch는 업로드 진행률(onprogress)을 표준으로 제공하지 않아 XHR 사용.
// presigned upload URL뿐 아니라 다른 PUT 대상에도 재사용 가능.

export interface PutBinaryOptions {
  uploadUrl: string;
  file: File;
  onPercent?: (percent: number) => void;
}

/** PUT 으로 presigned URL 또는 임의 대상에 업로드. 0~100 진행률 콜백. */
export function putBinary(opts: PutBinaryOptions): Promise<void> {
  const { uploadUrl, file, onPercent } = opts;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onPercent) {
        onPercent(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`PUT failed: ${xhr.status} ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error('PUT network error'));
    xhr.send(file);
  });
}
