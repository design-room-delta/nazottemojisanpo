import { useEffect, useRef, useState } from 'react'

export function ImageOverlay({
  imageDataUrl,
  naturalWidth,
  naturalHeight,
  tokens,
  activeTokenId,
  onTokenTap,
}) {
  const containerRef = useRef(null)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setDisplaySize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const scaleX = naturalWidth ? displaySize.width / naturalWidth : 0
  const scaleY = naturalHeight ? displaySize.height / naturalHeight : 0

  return (
    <div className="image-overlay" ref={containerRef}>
      <img
        src={imageDataUrl}
        alt="よみとった本のページ"
        className="overlay-image"
        draggable={false}
      />
      {scaleX > 0 &&
        tokens.map((token) => {
          const style = {
            left: token.bbox.x0 * scaleX,
            top: token.bbox.y0 * scaleY,
            width: (token.bbox.x1 - token.bbox.x0) * scaleX,
            height: (token.bbox.y1 - token.bbox.y0) * scaleY,
          }
          const isActive = token.id === activeTokenId
          return (
            <button
              key={token.id}
              type="button"
              className={`token-overlay${isActive ? ' token-overlay-active' : ''}`}
              style={style}
              onClick={() => onTokenTap(token)}
              aria-label={token.text}
            />
          )
        })}
    </div>
  )
}
