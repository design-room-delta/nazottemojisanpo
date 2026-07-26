import { useState } from 'react'

export function ScanScreen({ onCapture, error }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const handleSubmit = () => {
    if (file) onCapture(file)
  }

  return (
    <div className="scan-screen">
      <h1>ほんのページをよみとろう</h1>
      <p className="hint">まっすぐ・あかるいところで とってね</p>

      <label className="file-picker">
        {previewUrl ? 'べつの しゃしんをえらぶ' : 'しゃしんをとる／えらぶ'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />
      </label>

      {previewUrl && (
        <img src={previewUrl} alt="よみとる写真のプレビュー" className="preview-image" />
      )}

      {error && <p className="error-message">{error}</p>}

      <button
        type="button"
        className="primary-button"
        disabled={!file}
        onClick={handleSubmit}
      >
        よみとる
      </button>
    </div>
  )
}
