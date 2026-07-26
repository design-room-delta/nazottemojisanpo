import { useCallback, useRef, useState } from 'react'
import { pickJapaneseVoice } from '../lib/voice'

const ESTIMATED_CHARS_PER_SECOND = 6

// speechSynthesisのラップ。世代カウンタで「連続タップ」時の
// 古いutteranceのイベント（onboundary/onend）を無視できるようにする。
export function useSpeech() {
  const generationRef = useRef(0)
  const estimateTimerRef = useRef(null)
  const [speaking, setSpeaking] = useState(false)
  const [highlight, setHighlight] = useState(null)

  const clearEstimateTimer = () => {
    if (estimateTimerRef.current) {
      clearInterval(estimateTimerRef.current)
      estimateTimerRef.current = null
    }
  }

  const stop = useCallback(() => {
    generationRef.current += 1
    clearEstimateTimer()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
    setHighlight(null)
  }, [])

  const speak = useCallback((text, { onEnd } = {}) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return

    generationRef.current += 1
    clearEstimateTimer()
    window.speechSynthesis.cancel()
    const generation = generationRef.current

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    const voice = pickJapaneseVoice()
    if (voice) utterance.voice = voice

    let boundaryFired = false

    utterance.onboundary = (event) => {
      if (generation !== generationRef.current) return
      boundaryFired = true
      const charIndex = event.charIndex ?? 0
      const charLength = event.charLength ?? 1
      setHighlight({ start: charIndex, end: charIndex + charLength })
    }

    utterance.onend = () => {
      if (generation !== generationRef.current) return
      clearEstimateTimer()
      setSpeaking(false)
      setHighlight(null)
      onEnd?.()
    }

    utterance.onerror = () => {
      if (generation !== generationRef.current) return
      clearEstimateTimer()
      setSpeaking(false)
      setHighlight(null)
    }

    setSpeaking(true)
    window.speechSynthesis.speak(utterance)

    // boundaryイベントが発火しないブラウザ/エンジン向けの推定ハイライト
    setTimeout(() => {
      if (boundaryFired || generation !== generationRef.current) return
      let position = 0
      estimateTimerRef.current = setInterval(() => {
        if (generation !== generationRef.current) {
          clearEstimateTimer()
          return
        }
        position += ESTIMATED_CHARS_PER_SECOND
        if (position >= text.length) {
          clearEstimateTimer()
          return
        }
        setHighlight({ start: position, end: position + 1 })
      }, 1000)
    }, 400)
  }, [])

  return { speak, stop, speaking, highlight }
}
