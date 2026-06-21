// 디방인연 '내 대표 사진' — Setting에서 설정, 전 화면 공통(프로필·이음 신청·채팅 등).
// 백엔드 없이 데모: zustand persist(localStorage). 업로드 이미지는 캔버스로 축소 후 data URL 저장.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_INYEON_PHOTO = '/assets/inyeon-photos/my-profile.jpg'

interface InyeonProfileState {
  /** 내 디방인연 대표 사진 url (기본 = my-profile.jpg, 변경 시 data URL). */
  photoUrl: string
  setPhotoUrl: (url: string) => void
  reset: () => void
}

export const useInyeonProfile = create<InyeonProfileState>()(
  persist(
    (set) => ({
      photoUrl: DEFAULT_INYEON_PHOTO,
      setPhotoUrl: (photoUrl) => set({ photoUrl }),
      reset: () => set({ photoUrl: DEFAULT_INYEON_PHOTO }),
    }),
    { name: 'dibang:inyeon-profile' },
  ),
)

/** 업로드 이미지 → 축소 data URL(최대 변 480px·JPEG). localStorage 용량 보호. */
export async function fileToProfileDataUrl(file: File, max = 480): Promise<string> {
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
    if (!ctx) return url
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
