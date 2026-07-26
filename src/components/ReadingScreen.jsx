import { useMemo } from 'react'
import { ImageOverlay } from './ImageOverlay'
import { useSpeech } from '../hooks/useSpeech'
import { fullTextOf } from '../lib/tokenize'
import { findTokenIndexAt } from '../lib/textOffsets'

export function ReadingScreen({ page, onRestart }) {
  const { tokens, imageDataUrl, width, height } = page
  const fullText = useMemo(() => fullTextOf(tokens), [tokens])
  const { speak, stop, speaking, highlight } = useSpeech()

  const activeTokenId = useMemo(() => {
    if (!highlight) return null
    const index = findTokenIndexAt(tokens, highlight.start)
    return index >= 0 ? tokens[index].id : null
  }, [highlight, tokens])

  const handlePlayAll = () => {
    speak(fullText)
  }

  const handleTokenTap = (token) => {
    speak(token.text)
  }

  return (
    <div className="reading-screen">
      <ImageOverlay
        imageDataUrl={imageDataUrl}
        naturalWidth={width}
        naturalHeight={height}
        tokens={tokens}
        activeTokenId={activeTokenId}
        onTokenTap={handleTokenTap}
      />

      <div className="controls">
        <button type="button" className="primary-button" onClick={handlePlayAll}>
          {speaking ? 'もういちど よむ' : 'よんで'}
        </button>
        {speaking && (
          <button type="button" className="secondary-button" onClick={stop}>
            とめる
          </button>
        )}
        <button type="button" className="secondary-button" onClick={onRestart}>
          べつのページをよむ
        </button>
      </div>

      <p className="hint">きになる ことばを タップしてみてね</p>
    </div>
  )
}
