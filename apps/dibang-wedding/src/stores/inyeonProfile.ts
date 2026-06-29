// 디방인연 '내 대표 사진' — Setting에서 설정, 전 화면 공통(프로필·이음 신청·채팅 등).
// 이 사진은 **본인이 다른 사용자에게 보여주려고 설정하는 공개 프로필 사진**(소셜 그래프에 노출)이다.
// 공개가 설계 의도이므로 공개 Walrus(분산 블롭)에 올리고 aggregator URL로 표시한다(공개 사진엔 암호화 불필요).
//   ↳ 비밀 PII(법적 이름·사적 채팅·비공개 문서)는 다르다 — 그건 walrusStorePII(Seal encrypt 훅)로 암호화 후 저장.
// Walrus 실패 시 localStorage data URL 폴백.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { walrusStore, getWalrusConfig, ONCHAIN_BLOB_EPOCHS } from '@gorae/sui-sdk'

export const DEFAULT_INYEON_PHOTO = '/assets/inyeon-photos/my-profile.jpg'

interface InyeonProfileState {
  /** 내 디방인연 대표 사진 url (기본 = my-profile.jpg, 변경 시 data URL). */
  photoUrl: string
  /** 인연 전용 추가 사진 URL (최대 3장). Walrus URL 또는 data URL. */
  extraPhotos: string[]
  /** 인연 소개글 — 다른 모이가 내 프로필을 볼 때 표시되는 짧은 자기소개. */
  bio: string
  setPhotoUrl: (url: string) => void
  addExtraPhoto: (url: string) => void
  removeExtraPhoto: (index: number) => void
  setBio: (bio: string) => void
  reset: () => void
}

export const useInyeonProfile = create<InyeonProfileState>()(
  persist(
    (set) => ({
      photoUrl: DEFAULT_INYEON_PHOTO,
      extraPhotos: [],
      bio: '',
      setPhotoUrl: (photoUrl) => set({ photoUrl }),
      addExtraPhoto: (url) => set((s) => ({ extraPhotos: s.extraPhotos.length < 3 ? [...s.extraPhotos, url] : s.extraPhotos })),
      removeExtraPhoto: (index) => set((s) => ({ extraPhotos: s.extraPhotos.filter((_, i) => i !== index) })),
      setBio: (bio) => set({ bio: bio.slice(0, 100) }),
      reset: () => set({ photoUrl: DEFAULT_INYEON_PHOTO, extraPhotos: [], bio: '' }),
    }),
    { name: 'dibang:inyeon-profile' },
  ),
)

/** 업로드 이미지를 캔버스로 축소한 canvas를 만든다(최대 변 max px). */
async function reduceToCanvas(file: File, max: number): Promise<HTMLCanvasElement | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 업로드 이미지 → 축소 data URL(최대 변 480px·JPEG). Walrus 실패 시 폴백용. */
export async function fileToProfileDataUrl(file: File, max = 480): Promise<string> {
  const canvas = await reduceToCanvas(file, max)
  return canvas ? canvas.toDataURL('image/jpeg', 0.85) : URL.createObjectURL(file)
}

/**
 * 업로드 이미지 → 축소 JPEG 바이트 → **공개 Walrus 저장** → { blobId, 표시용 aggregator URL }.
 * 공개 프로필 사진을 분산 저장하고 표시는 blob URL로 한다(다른 사용자도 봐야 하므로 공개가 정상).
 * 온체인 참조가 필요해지면 이 blobId를 컨트랙트에 남기는 패턴(note::send_note와 동일)으로 확장한다.
 */
export async function fileToWalrusPhoto(file: File, max = 480): Promise<{ blobId: string; url: string }> {
  const canvas = await reduceToCanvas(file, max)
  if (!canvas) throw new Error('이미지 축소 실패')
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob 실패'))), 'image/jpeg', 0.85),
  )
  const bytes = new Uint8Array(await blob.arrayBuffer())
  // 공개 프로필 사진 — 암호화 불필요(공개 노출이 설계 의도). 표시 URL이 오래 살아야 하므로 내구 epoch로 저장.
  const blobId = await walrusStore(bytes, { epochs: ONCHAIN_BLOB_EPOCHS })
  const { aggregator } = getWalrusConfig()
  return { blobId, url: `${aggregator}/v1/blobs/${blobId}` }
}
