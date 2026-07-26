let cachedVoices = []

function loadVoices() {
  cachedVoices = window.speechSynthesis?.getVoices() ?? []
  return cachedVoices
}

// getVoices()は初回同期呼び出しで空配列を返すことがあるため、
// voiceschangedイベントで再取得できるようにしておく。
export function initVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

export function pickJapaneseVoice() {
  const voices = cachedVoices.length ? cachedVoices : loadVoices()
  return (
    voices.find((voice) => voice.lang === 'ja-JP') ??
    voices.find((voice) => voice.lang?.startsWith('ja')) ??
    null
  )
}
