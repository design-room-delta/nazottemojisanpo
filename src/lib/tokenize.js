import { unionBbox } from './bbox'

const BREAK_CHARS = new Set(['。', '、', '！', '？', '!', '?', '…'])

// イラスト部分などをTesseractが誤って文字として読んでしまった場合、
// その誤読は確信度(confidence)が低く出る傾向があるため、閾値未満は除外する。
// Tesseractのconfidenceは0〜100のスケール。
// 文字種をひらがな・カタカナ・数字・句読点のみに制限した(useOcr.js)ことで
// 極端な誤読は起きにくくなったため、本物の文字の読み飛ばしを減らす方向に
// 緩めている(80→65)。
const MIN_SYMBOL_CONFIDENCE = 65

// 紙の質感やノイズによる誤検出は、本文の文字サイズに比べて極端に
// 小さいことが多いため、ページ内の文字高さの中央値に対して
// 極端に小さいsymbolも除外する。
const MIN_HEIGHT_RATIO = 0.5

// 中央値自体がノイズに引きずられて下がるケースへの保険として、
// 絶対的な最小ピクセル高さも設ける（画像は長辺1600pxに正規化済み）。
const MIN_ABSOLUTE_HEIGHT_PX = 8

// イラストの線などが「|」「-」「.」のような記号1文字に誤認識された場合、
// それが単独でconfidence/サイズ条件を満たしてしまうことがあるため、
// ひらがな・カタカナ・英数字・正当な句読点を含まない文字は除外する。
// 幼児向けアプリのため漢字は対象外。
const MEANINGFUL_CHAR = /[\p{Script=Hiragana}\p{Script=Katakana}a-zA-Z0-9]/u

function isMeaningfulChar(char) {
  return BREAK_CHARS.has(char) || MEANINGFUL_CHAR.test(char)
}

// ノイズの行の中で、たまたま数文字だけ高confidenceになったケースを
// 取りこぼさないよう、行内の平均confidenceが低い行はそもそも読まない。
// MIN_SYMBOL_CONFIDENCEと同様の理由で緩めている(60→45)。
const MIN_LINE_AVERAGE_CONFIDENCE = 45

function symbolHeight(symbol) {
  return symbol.bbox.y1 - symbol.bbox.y0
}

function averageConfidence(symbols) {
  const withText = symbols.filter((symbol) => symbol.text && symbol.text.trim() !== '')
  if (withText.length === 0) return 0
  return withText.reduce((sum, symbol) => sum + symbol.confidence, 0) / withText.length
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

  const isValidSymbol = (symbol) => {
    const char = symbol.text?.trim()
    return (
      !!char &&
      symbol.confidence >= MIN_SYMBOL_CONFIDENCE &&
      isMeaningfulChar(char)
    )
  }

  const allValidSymbols = lines
    .flatMap((line) => line.words.flatMap((word) => word.symbols))
    .filter(isValidSymbol)
  const minHeight = Math.max(
    medianHeight(allValidSymbols) * MIN_HEIGHT_RATIO,
    MIN_ABSOLUTE_HEIGHT_PX,
  )

  for (const line of lines) {
    const rawSymbols = line.words.flatMap((word) => word.symbols)
    if (averageConfidence(rawSymbols) < MIN_LINE_AVERAGE_CONFIDENCE) continue

    const symbols = rawSymbols.filter(
      (symbol) => isValidSymbol(symbol) && symbolHeight(symbol) >= minHeight,
    )

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
