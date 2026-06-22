/**
 * MemoryBookViewer (v3 어댑터)
 *
 * v3 contract `MemoryBookData` (snake_case) → v2 `MemoryBookData` (camelCase) 변환.
 * Supabase Storage의 storage_path 들을 signed URL로 변환한 뒤
 * MemoryBookV2_4Inner에 넘긴다.
 *
 * 책임 분리(P3-9):
 *   - signed URL 조회: queries/memorybook/useSharedPhotoSignedUrls
 *   - v3 → v2 shape 변환: lib/memorybookAdapter.toV2MemoryBookData
 *   - Viewer 자체는 훅 결과를 받아 변환 호출 후 Inner에 props만 주입
 *
 * curated_photos / display_photos 모두 동일한 v3-uploads-private 버킷에 있다고 가정
 * (현행 sharedPhotoUrl 헬퍼 기준). 다른 버킷에 위치한 경우 signed URL이 비어
 * MemoryBookV2_4Inner 측에서는 해당 사진이 단순히 표시되지 않을 뿐 렌더는 유지된다.
 */

import { useMemo } from 'react'
import type { MemoryBookData as V3MemoryBookData } from '../../types/db-compat'
import { useSharedPhotoSignedUrls } from '../../queries/memorybook/useSharedPhotoSignedUrls'
import { toV2MemoryBookData } from '../../lib/memorybookAdapter'
import { MemoryBookV2_4Inner } from './MemoryBookV2_4Inner'

interface MemoryBookViewerProps {
  data: V3MemoryBookData
  weddingId: string
}

export function MemoryBookViewer({ data, weddingId }: MemoryBookViewerProps) {
  // curated_photos(shared) 만 signed URL 필요. display/cover는 청첩장 public URL.
  const paths = useMemo(
    () => data.curated_photos.map((p) => p.storage_path),
    [data.curated_photos],
  )
  const signedMap = useSharedPhotoSignedUrls(paths)

  const v2Data = useMemo(() => toV2MemoryBookData(data, signedMap), [data, signedMap])

  return <MemoryBookV2_4Inner data={v2Data} weddingId={weddingId} />
}
