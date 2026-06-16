// 레거시 @gorae/shared/lib/maskName 의 동일 구현. mecdisplay 시각 동일성 보존.
// 한 글자 → '*', 두 글자 → '○*', 세 글자 이상 → '○***○'.
export function maskName(name: string): string {
  if (name.length <= 1) return '*'
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}
