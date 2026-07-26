import { useCallback, useState } from 'react'
import { createWorker, PSM } from 'tesseract.js'

const MAX_DIMENSION = 1600

// 幼児向けのため漢字は対象外にし、ひらがな・カタカナ・数字・句読点のみを
// 認識対象にする。文字集合を絞ることで、イラストのノイズが
// 「それらしい漢字」に誤認識されること自体を防ぐ。
function codeRange(start, end) {
  let chars = ''
  for (let code = start; code <= end; code++) {
    chars += String.fromCodePoint(code)
  }
  return chars
}

const CHAR_WHITELIST =
  codeRange(0x3041, 0x3096) + // ひらがな(ぁ〜ゖ)
  codeRange(0x30a1, 0x30fc) + // カタカナ(ァ〜ー)
  '0123456789' +
  codeRange(0xff10, 0xff19) + // ０〜９(全角数字)
  '。、！？!?…'

// EXIF回転を反映して正立化した上でcanvasに描画する。
// このcanvasを表示用画像・Tesseractへの入力の両方に使うことで、
// OCRのbbox座標と実際に表示される画像のズレを防ぐ。
async function normalizeImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvas
}

export function useOcr() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')

  const run = useCallback(async (file) => {
    setProgress(0)
    setStatus('じゅんびちゅう')

    const canvas = await normalizeImage(file)

    const worker = await createWorker('jpn', 1, {
      logger: (message) => {
        setStatus(message.status)
        if (typeof message.progress === 'number') setProgress(message.progress)
      },
    })

    try {
      // AUTO: ページ全体を解析して「文字のまとまり(ブロック)」を判定してから読む。
      // イラストを誤ってまとまりと判定するリスクはあるが、confidence/サイズの
      // フィルター(tokenize.js側)と組み合わせて誤読を抑える方針にする。
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        tessedit_char_whitelist: CHAR_WHITELIST,
      })
      const { data } = await worker.recognize(canvas, {}, { blocks: true })
      return {
        imageDataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: canvas.width,
        height: canvas.height,
        blocks: data.blocks ?? [],
      }
    } finally {
      await worker.terminate()
    }
  }, [])

  return { run, progress, status }
}
