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

// グレースケール化した上で、明るさの最小・最大を画像いっぱいに引き伸ばす
// (コントラストストレッチ)。スマホ撮影は照明ムラ・影が入りやすく、
// Tesseract内部の二値化(白黒分け)の精度を底上げできる。
// 表示用画像は元のカラーのまま保つため、別canvasに対して行う。
function enhanceContrast(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height)
  const data = imageData.data
  const luminances = new Uint8ClampedArray(width * height)

  let min = 255
  let max = 0
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    luminances[i / 4] = luminance
    if (luminance < min) min = luminance
    if (luminance > max) max = luminance
  }

  const range = max - min
  if (range === 0) return

  for (let i = 0; i < data.length; i += 4) {
    const stretched = Math.round(((luminances[i / 4] - min) / range) * 255)
    data[i] = stretched
    data[i + 1] = stretched
    data[i + 2] = stretched
  }

  context.putImageData(imageData, 0, 0)
}

function createOcrCanvas(sourceCanvas) {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height
  const context = canvas.getContext('2d')
  context.drawImage(sourceCanvas, 0, 0)
  enhanceContrast(context, canvas.width, canvas.height)
  return canvas
}

// よこがき(jpn)・たてがき(jpn_vert)のどちらかを自動判定するため、
// 両方の言語データで解析し、Tesseractが返すページ全体のconfidenceが
// 高い方(=文字の並び方向が合っている方)を採用する。
const ORIENTATIONS = [
  { lang: 'jpn', label: 'よこがき' },
  { lang: 'jpn_vert', label: 'たてがき' },
]

async function recognizeWithLang(ocrCanvas, lang, label, onProgress) {
  const worker = await createWorker(lang, 1, {
    logger: (message) => {
      onProgress(label, message)
    },
  })

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_char_whitelist: CHAR_WHITELIST,
    })
    const { data } = await worker.recognize(ocrCanvas, {}, { blocks: true })
    return data
  } finally {
    await worker.terminate()
  }
}

export function useOcr() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')

  const run = useCallback(async (file) => {
    setProgress(0)
    setStatus('じゅんびちゅう')

    const canvas = await normalizeImage(file)
    const ocrCanvas = createOcrCanvas(canvas)

    let bestData = null

    for (let i = 0; i < ORIENTATIONS.length; i++) {
      const { lang, label } = ORIENTATIONS[i]
      const data = await recognizeWithLang(ocrCanvas, lang, label, (currentLabel, message) => {
        setStatus(`${currentLabel}として${message.status}`)
        if (typeof message.progress === 'number') {
          setProgress((i + message.progress) / ORIENTATIONS.length)
        }
      })

      if (!bestData || data.confidence > bestData.confidence) {
        bestData = data
      }
    }

    return {
      imageDataUrl: canvas.toDataURL('image/jpeg', 0.92),
      width: canvas.width,
      height: canvas.height,
      blocks: bestData?.blocks ?? [],
    }
  }, [])

  return { run, progress, status }
}
