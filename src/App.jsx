import { useCallback, useEffect, useState } from 'react'
import { ScanScreen } from './components/ScanScreen'
import { LoadingIndicator } from './components/LoadingIndicator'
import { ReadingScreen } from './components/ReadingScreen'
import { useOcr } from './hooks/useOcr'
import { tokenize } from './lib/tokenize'
import { initVoices } from './lib/voice'
import './App.css'

function App() {
  const [appState, setAppState] = useState('scan')
  const [page, setPage] = useState(null)
  const [error, setError] = useState(null)
  const { run, progress, status } = useOcr()

  useEffect(() => {
    initVoices()
  }, [])

  const handleCapture = useCallback(
    async (file) => {
      setError(null)
      setAppState('ocr-processing')
      try {
        const result = await run(file)
        const tokens = tokenize(result.blocks)
        if (tokens.length === 0) {
          setError(
            'もじが みつからなかったよ。もういちど、まっすぐ・あかるいところで とってね。',
          )
          setAppState('scan')
          return
        }
        setPage({ ...result, tokens })
        setAppState('reading')
      } catch (e) {
        console.error(e)
        setError('よみとりに しっぱいしたよ。もういちど ためしてね。')
        setAppState('scan')
      }
    },
    [run],
  )

  const handleRestart = useCallback(() => {
    setPage(null)
    setError(null)
    setAppState('scan')
  }, [])

  return (
    <div className="app">
      {appState === 'scan' && <ScanScreen onCapture={handleCapture} error={error} />}
      {appState === 'ocr-processing' && (
        <LoadingIndicator status={status} progress={progress} />
      )}
      {appState === 'reading' && page && (
        <ReadingScreen page={page} onRestart={handleRestart} />
      )}
    </div>
  )
}

export default App
