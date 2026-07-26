import { unionBbox } from './bbox'

const BREAK_CHARS = new Set(['。', '、', '！', '？', '!', '?', '…'])

// イラスト部分などをTesseractが誤って文字として読んでしまった場合、
// その誤読は確信度(confidence)が低く出る傾向があるため、閾値未満は除外する。
// Tesseractのconfidenceは0〜100のスケール。
const MIN_SYMBOL_CONFIDENCE = 80

// 紙の質感やノイズによる誤検出は、本文の文字サイズに比べて極端に
// 小さいことが多いため、ページ内の文字高さの中央値に対して
// 極端に小さいsymbolも除外する。
const MIN_HEIGHT_RATIO = 0.5

function symbolHeight(symbol) {
  return symbol.bbox.y1 - symbol.bbox.y0
}

function medianHeight(symbols) {
  if (symbols.length === 0) return 0
  const heights = symbols.map(symbolHeight).sort((a, b) => a - b)
  const mid = Math.floor(heights.length / 2)
  return heights.length % 2 === 0
    ? (heights[mid - 1] + heights[mid]) / 2
    : heights[mid]
}

// Tesseractのblocks階層（block > paragraph > line > word > symbol）から、
// 行をまたがない「読み上げ・タップ単位」のトークン列を作る。
// 日本語は分かち書きされないため、Tesseractの単語(word)クラスタリングは使わず、
// 文字(symbol)単位を最終ソースとして句読点・行末で区切る。
export function tokenize(blocks) {
  const tokens = []
  let cursor = 0
  let tokenId = 0

  const lines = (blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.lines),
  )

  const isValidSymbol = (symbol) =>
    symbol.text && symbol.text.trim() !== '' && symbol.confidence >= MIN_SYMBOL_CONFIDENCE

  const allValidSymbols = lines
    .flatMap((line) => line.words.flatMap((word) => word.symbols))
    .filter(isValidSymbol)
  const minHeight = medianHeight(allValidSymbols) * MIN_HEIGHT_RATIO

  for (const line of lines) {
    const symbols = line.words
      .flatMap((word) => word.symbols)
      .filter((symbol) => isValidSymbol(symbol) && symbolHeight(symbol) >= minHeight)

    if (symbols.length === 0) continue

    let buffer = []

    const flush = () => {
      if (buffer.length === 0) return
      const text = buffer.map((symbol) => symbol.text).join('')
      const start = cursor
      cursor += text.length
      tokens.push({
        id: tokenId++,
        text,
        start,
        end: cursor,
        bbox: unionBbox(buffer.map((symbol) => symbol.bbox)),
      })
      buffer = []
    }

    for (const symbol of symbols) {
      buffer.push(symbol)
      if (BREAK_CHARS.has(symbol.text.trim())) {
        flush()
      }
    }
    flush()
  }

  return tokens
}

export function fullTextOf(tokens) {
  return tokens.map((token) => token.text).join('')
}
