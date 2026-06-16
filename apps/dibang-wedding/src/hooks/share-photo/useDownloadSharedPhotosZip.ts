/**
 * 공유 사진 ZIP 다운로드 mutation 훅 (UI/데이터 분리 P3-7).
 *
 * lib/sharedPhotosZip의 service를 useMutation으로 감싸서
 * { mutate, isPending, error }를 컴포넌트에 노출.
 * alert는 service 단계에서 제거됐고, 에러는 mutation state로 표면화된다.
 * (toast 통일은 P4-10에서 진행)
 */
import { useMutation } from '@tanstack/react-query';
import {
  downloadSharedPhotosZip,
  type DownloadSharedPhotosZipArgs,
} from '../../lib/sharedPhotosZip';

export function useDownloadSharedPhotosZip() {
  return useMutation<void, Error, DownloadSharedPhotosZipArgs>({
    mutationFn: (args) => downloadSharedPhotosZip(args),
  });
}
