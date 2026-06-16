// UI/데이터 분리 P1-2: 본문은 packages/web-utils로 승격됨.
// 기존 import 경로를 깨뜨리지 않기 위해 re-export 한 줄만 남긴다.
export { useCopyToClipboard } from '@gorae/web-utils';
