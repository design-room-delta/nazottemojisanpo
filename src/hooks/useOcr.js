import { useCallback, useState } from 'react'
import { createWorker } from 'tesseract.js'

const MAX_DIMENSION = 1600

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
