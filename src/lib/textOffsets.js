// charIndexを含むトークンをトークン配列(startでソート済み)から二分探索で見つける。
// どのトークン範囲にも入らない場合は直近のトークンにフォールバックする。
export function findTokenIndexAt(tokens, charIndex) {
  if (tokens.length === 0) return -1

  let lo = 0
  let hi = tokens.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const token = tokens[mid]
    if (charIndex < token.start) {
      hi = mid - 1
    } else if (charIndex >= token.end) {
      lo = mid + 1
    } else {
      return mid
    }
  }

  return Math.min(Math.max(lo, 0), tokens.length - 1)
}
