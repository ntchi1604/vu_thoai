import { Copy, FloppyDisk, Microphone, Stop, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { copyText } from '../utils/clipboard.js'
import { StatusMessage } from './StatusMessage.jsx'

export function SpeechToTextPanel({ onAddHistory }) {
  const {
    clearTranscript,
    finalText,
    interimText,
    isListening,
    isSupported,
    speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition()
  const [copyStatus, setCopyStatus] = useState('')
  const hasFinalText = finalText.trim().length > 0

  async function handleCopy() {
    const response = await copyText(finalText)
    setCopyStatus(response.message)
  }

  function handleClear() {
    clearTranscript()
    setCopyStatus('')
  }

  function handleSave() {
    if (!hasFinalText) return
    onAddHistory({ type: 'speech', text: finalText })
  }

  function toggleListening() {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className="speech-content">
      <h2 className="panel-title">Speech-to-Text</h2>

      <div className="speech-visual-area">
        <button
          aria-label={isListening ? 'Dừng nghe' : 'Bắt đầu nghe'}
          className={`speech-listen-control ${isListening ? 'is-listening' : ''}`}
          disabled={!isSupported}
          onClick={toggleListening}
          type="button"
        >
          <span className="sound-bars sound-bars-left" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          <span className="microphone-orb">
            {isListening ? <Stop size={56} weight="fill" /> : <Microphone size={72} weight="duotone" />}
          </span>
          <span className="sound-bars sound-bars-right" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
        </button>
        <p>{isListening ? 'Đang lắng nghe... (vi-VN)' : 'Nhấn micro để bắt đầu... (vi-VN)'}</p>
      </div>

      {!isSupported ? (
        <StatusMessage tone="error">Trình duyệt chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge trên máy tính.</StatusMessage>
      ) : null}
      <StatusMessage tone="error">{speechError}</StatusMessage>
      <StatusMessage>{copyStatus}</StatusMessage>

      <div className="speech-transcript" aria-live="polite" aria-label="Văn bản nhận diện">
        <span className="transcript-label">Confirmed text:</span>
        {hasFinalText ? (
          <p className="final-transcript">{finalText}</p>
        ) : (
          <p className="transcript-placeholder">Ứng dụng Vũ Thoại đang chờ giọng nói của bạn.</p>
        )}
        {interimText ? <p className="interim-transcript">{interimText}</p> : null}
        <span className="transcript-label interim-label">Interim text: {isListening ? '(đang nói)' : ''}</span>
        {!hasFinalText && !interimText ? <strong>Nhấn micro để bắt đầu giao tiếp.</strong> : null}
      </div>

      <div className="speech-actions">
        <button className="ui-button" disabled={!hasFinalText && !interimText} onClick={handleClear} type="button">
          <Trash size={17} weight="regular" aria-hidden="true" />
          Xóa
        </button>
        <button className="ui-button" disabled={!hasFinalText} onClick={handleCopy} type="button">
          <Copy size={17} weight="regular" aria-hidden="true" />
          Sao chép
        </button>
        <button className="ui-button" disabled={!hasFinalText} onClick={handleSave} type="button">
          <FloppyDisk size={17} weight="regular" aria-hidden="true" />
          Lưu vào nhật ký
        </button>
      </div>
    </div>
  )
}
