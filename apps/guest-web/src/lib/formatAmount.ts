export function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

export function amountToKorean(amount: number): string {
  if (!amount || amount <= 0) return ''
  const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
  function formatGroup(n: number): string {
    const cheon = Math.floor(n / 1000)
    const baek = Math.floor((n % 1000) / 100)
    const sip = Math.floor((n % 100) / 10)
    const il = n % 10
    let s = ''
    if (cheon > 0) s += DIGITS[cheon] + '천'
    if (baek > 0) s += DIGITS[baek] + '백'
    if (sip > 0) s += DIGITS[sip] + '십'
    if (il > 0) s += DIGITS[il]
    return s
  }
  const eok = Math.floor(amount / 100_000_000)
  const man = Math.floor((amount % 100_000_000) / 10_000)
  const rest = amount % 10_000
  let result = ''
  if (eok > 0) result += formatGroup(eok) + '억'
  if (man > 0) result += formatGroup(man) + '만'
  if (rest > 0) result += formatGroup(rest)
  return result + '원'
}
