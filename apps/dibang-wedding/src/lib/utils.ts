import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn/ui 공통 className 머지 헬퍼 (tailwind 충돌 해결 포함). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
