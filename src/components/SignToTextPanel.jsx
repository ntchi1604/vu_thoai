import {
  ArrowCounterClockwise,
  Bug,
  Camera,
  CaretDown,
  CaretUp,
  Database,
  HandWaving,
  Microphone,
  Record,
  SpeakerHigh,
  SpeakerSlash,
  StopCircle,
  Trash,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { useCamera } from '../hooks/useCamera.js'
import { useHandLandmarker } from '../hooks/useHandLandmarker.js'
import { useTwoHandSequenceLibrary } from '../hooks/useTwoHandSequenceLibrary.js'
import { playGestureAudio, replayGestureAudio, stopGestureAudio } from '../services/vietnameseAudioService.js'
import { StatusMessage } from './StatusMessage.jsx'

export function SignToTextPanel({ onAddHistory }) {
  const reduce = useReducedMotion()
  const { cameraError, isCameraOn, startCamera, stopCamera, videoRef } = useCamera()
  const {
    addTemplate: addSequenceTemplate,
    labels: sequenceLabels,
    removeLabel: removeSequenceLabel,
    templates: sequenceTemplates,
  } = useTwoHandSequenceLibrary()
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(false)
  const [isDebugVisible, setIsDebugVisible] = useState(false)
  const [isSequenceLibraryVisible, setIsSequenceLibraryVisible] = useState(false)
  const [resultSentence, setResultSentence] = useState('')
  const [resultGesture, setResultGesture] = useState('')
  const [sequenceLabel, setSequenceLabel] = useState('')
  const [sequencePhrase, setSequencePhrase] = useState('')
  const [sequenceStatus, setSequenceStatus] = useState('')

  const handleGestureRecognized = useCallback(
    ({ gesture, phrase }) => {
      setResultSentence(phrase)
      setResultGesture(gesture)
      onAddHistory({ type: 'sign', text: phrase, gesture })
      if (isAutoSpeakEnabled) {
        playGestureAudio(gesture, phrase)
      }
    },
    [isAutoSpeakEnabled, onAddHistory],
  )

  useEffect(() => () => stopGestureAudio(), [])

  const {
    cancelSequenceRecording,
    canvasRef,
    debugInfo,
    detectedHands,
    detectionStatus,
    gestureInfo,
    landmarkerError,
    modelStatus,
    rearmRecognition,
    sequenceRecording,
    startSequenceRecording,
  } = useHandLandmarker({
    isCameraOn,
    onGestureRecognized: handleGestureRecognized,
    sequenceTemplates,
    videoRef,
  })

  const currentSentence = gestureInfo.isStable && gestureInfo.phrase ? gestureInfo.phrase : resultSentence
  const currentGesture = gestureInfo.isStable ? gestureInfo.stableGesture : resultGesture || gestureInfo.technicalGesture
  const liveCameraCaption = sequenceRecording.isRecording ? '' : currentSentence
  const recordingPrompt = getRecordingPrompt(sequenceRecording)
  const displaySentence = currentSentence || 'Chưa có kết quả.'
  const displayGesture = currentGesture || 'UNKNOWN'

  function handleReplay() {
    replayGestureAudio(resultGesture || gestureInfo.stableGesture, currentSentence)
  }

  function handleEnableSpeech() {
    setIsAutoSpeakEnabled(true)
    if (currentSentence) handleReplay()
  }

  function handleDisableSpeech() {
    setIsAutoSpeakEnabled(false)
    stopGestureAudio()
  }

  function handleClearResult() {
    setResultSentence('')
    setResultGesture('')
    stopGestureAudio()
  }

  function handleCameraToggle() {
    if (isCameraOn) stopCamera()
    else startCamera()
  }

  async function handleRecordSequence() {
    const label = sequenceLabel.trim()
    const phrase = sequencePhrase.trim()

    if (!label || !phrase) {
      setSequenceStatus('Cần nhập nhãn và câu kết quả.')
      return
    }

    setSequenceStatus('')
    const result = await startSequenceRecording({ label, phrase })

    if (!result.ok) {
      setSequenceStatus(result.error)
      return
    }

    addSequenceTemplate(result)
    setSequenceStatus(`Đã lưu một mẫu cho ${result.label}.`)
  }

  return (
    <div className="sign-content">
      <h2 className="panel-title">Sign-to-Text</h2>

      <div className="camera-stage camera-card">
        <div className="camera-viewport">
          <video aria-label="Video trực tiếp từ camera" autoPlay className="camera-video" muted playsInline ref={videoRef} />
          <canvas aria-label="Lớp vẽ landmark bàn tay" className="camera-canvas" ref={canvasRef} />

          {!isCameraOn ? (
            <div className="camera-empty">
              <Camera size={40} weight="duotone" aria-hidden="true" />
              <strong>Camera chưa được bật</strong>
              <span>Cho phép truy cập camera để bắt đầu nhận diện.</span>
            </div>
          ) : null}

          {isCameraOn && recordingPrompt ? (
            <motion.div
              aria-live="assertive"
              className={`camera-recording-prompt is-${sequenceRecording.phase}`}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              key={`${sequenceRecording.phase}-${sequenceRecording.countdown}`}
            >
              <span className="recording-prompt-mark" aria-hidden="true">
                {sequenceRecording.phase === 'countdown'
                  ? sequenceRecording.countdown
                  : <Record size={20} weight="fill" />}
              </span>
              <span className="recording-prompt-copy">
                <small>Ghi mẫu · {sequenceRecording.label}</small>
                <strong>{recordingPrompt.title}</strong>
                <span>{recordingPrompt.detail}</span>
              </span>
            </motion.div>
          ) : null}

          {isCameraOn && liveCameraCaption ? (
            <motion.div
              className="camera-subtitle"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {liveCameraCaption}
            </motion.div>
          ) : null}

          <div className="diagnostics-overlay">
            <button aria-expanded={isDebugVisible} onClick={() => setIsDebugVisible((value) => !value)} type="button">
              <strong>Diagnostics</strong>
              {isDebugVisible ? <CaretUp size={13} /> : <CaretDown size={13} />}
            </button>
            <span>Hands: <strong>{detectedHands}</strong></span>
            <span>Model: <strong>{modelStatus.includes('sẵn sàng') ? 'Ready' : modelStatus}</strong></span>
            {isDebugVisible ? <span>Gesture: <strong>{debugInfo.rawGesture}</strong></span> : null}
          </div>
        </div>
      </div>

      <div className="camera-alerts">
        <StatusMessage tone="error">{cameraError}</StatusMessage>
        <StatusMessage tone="error">{landmarkerError}</StatusMessage>
      </div>

      <div className="sign-control-grid">
        <div className="control-card camera-control-card">
          <button className={`control-tile ${isCameraOn ? 'coral-tile' : ''}`} onClick={handleCameraToggle} type="button">
            {isCameraOn
              ? <HandWaving size={28} weight="duotone" aria-hidden="true" />
              : <Camera size={28} weight="duotone" aria-hidden="true" />}
            <span>{isCameraOn ? 'Tắt Camera' : 'Bật Camera'}</span>
          </button>
          <button className="control-tile" onClick={() => setIsDebugVisible((value) => !value)} type="button">
            <Bug size={27} weight="duotone" aria-hidden="true" />
            <span>Chẩn đoán</span>
          </button>
          <button className="control-tile" disabled={!isCameraOn || !currentSentence} onClick={rearmRecognition} type="button">
            <ArrowCounterClockwise size={28} weight="duotone" aria-hidden="true" />
            <span>Làm mới cử chỉ</span>
          </button>
        </div>

        <div className="control-card result-card">
          <div>
            <span>Cử chỉ: <strong className="technical-value">{displayGesture}</strong></span>
            <span>Kết quả:</span>
            <strong className="result-phrase">{displaySentence}</strong>
          </div>
          <button className="result-speaker" disabled={!currentSentence} onClick={handleReplay} title="Đọc kết quả" type="button">
            <SpeakerHigh size={48} weight="duotone" aria-hidden="true" />
          </button>
        </div>

        <div className="control-card phrase-card">
          <div className="phrase-mic" aria-hidden="true"><Microphone size={38} weight="duotone" /></div>
          <strong>{currentSentence || 'Sẵn sàng giao tiếp'}</strong>
        </div>

        <div className="control-card audio-control-card">
          <button className={`control-tile ${isAutoSpeakEnabled ? 'coral-tile' : ''}`} onClick={handleEnableSpeech} type="button">
            <Microphone size={24} weight="duotone" /><span>Đọc kết quả</span>
          </button>
          <button className="control-tile" disabled={!currentSentence} onClick={handleReplay} type="button">
            <ArrowCounterClockwise size={24} weight="duotone" /><span>Đọc lại</span>
          </button>
          <button className="control-tile" onClick={stopGestureAudio} type="button">
            <StopCircle size={24} weight="duotone" /><span>Dừng đọc</span>
          </button>
          <button className={`control-tile ${!isAutoSpeakEnabled ? 'coral-tile' : ''}`} onClick={handleDisableSpeech} type="button">
            <SpeakerSlash size={24} weight="duotone" /><span>Không đọc</span>
          </button>
          <button className="clear-result-button" disabled={!currentSentence} onClick={handleClearResult} title="Xóa kết quả" type="button">
            <Trash size={15} weight="regular" />
          </button>
        </div>
      </div>

      {isDebugVisible ? (
        <motion.dl
          className="debug-grid"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DebugItem label="Trạng thái phát hiện" value={detectionStatus} />
          <DebugItem label="Cử chỉ thô" value={debugInfo.rawGesture} />
          <DebugItem label="Cử chỉ ổn định" value={debugInfo.stableGesture} />
          <DebugItem label="Đồng thuận" value={`${debugInfo.voteCount}/${debugInfo.frameWindowSize}`} />
        </motion.dl>
      ) : null}

      <div className="sequence-library-bar">
        <button
          aria-expanded={isSequenceLibraryVisible}
          onClick={() => setIsSequenceLibraryVisible((value) => !value)}
          type="button"
        >
          <Database size={16} weight="duotone" />
          Thư viện ký hiệu
          <span>{sequenceLabels.length}</span>
        </button>
      </div>

      {isSequenceLibraryVisible ? (
        <motion.section
          className="sequence-trainer"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          aria-label="Huấn luyện ký hiệu một hoặc hai tay"
        >
          <div className="sequence-form-grid">
            <label>
              <span>Nhãn kỹ thuật</span>
              <input
                disabled={sequenceRecording.isRecording}
                onChange={(event) => setSequenceLabel(event.target.value)}
                placeholder="VD: CAM_ON"
                value={sequenceLabel}
              />
            </label>
            <label>
              <span>Câu tiếng Việt</span>
              <input
                disabled={sequenceRecording.isRecording}
                onChange={(event) => setSequencePhrase(event.target.value)}
                placeholder="VD: Cảm ơn bạn."
                value={sequencePhrase}
              />
            </label>
          </div>

          <div className="sequence-record-row">
            {sequenceRecording.isRecording ? (
              <button className="ui-button" onClick={cancelSequenceRecording} type="button">
                Dừng ghi
              </button>
            ) : (
              <button
                className="ui-button sequence-record-button"
                disabled={!isCameraOn || !modelStatus.includes('sẵn sàng')}
                onClick={handleRecordSequence}
                type="button"
              >
                <Record size={16} weight="fill" />
                  Ghi mẫu ký hiệu
              </button>
            )}
            <span>{sequenceRecording.status || sequenceStatus}</span>
          </div>

          {sequenceRecording.isRecording ? (
            <div className="sequence-progress" aria-label="Tiến độ ghi mẫu">
              <i style={{ width: `${sequenceRecording.progress * 100}%` }} />
            </div>
          ) : null}

          {sequenceLabels.length > 0 ? (
            <ul className="sequence-label-list">
              {sequenceLabels.map((item) => (
                <li key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.phrase} · {item.handCount} tay</span>
                  </div>
                  <span className={item.count >= 2 ? 'sequence-ready' : ''}>{item.count}/2 mẫu</span>
                  <button
                    onClick={() => removeSequenceLabel(item.label, item.handCount)}
                    title={`Xóa ${item.label}`}
                    type="button"
                  >
                    <Trash size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </motion.section>
      ) : null}
    </div>
  )
}

function DebugItem({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function getRecordingPrompt(recording) {
  if (!recording.isRecording) return null

  if (recording.phase === 'countdown') {
    return { detail: 'Giữ nguyên tư thế', title: 'Chuẩn bị' }
  }
  if (recording.phase === 'ready') {
    return { detail: 'Bắt đầu!', title: 'Sẵn sàng' }
  }
  if (recording.phase === 'recording') {
    return { detail: 'Thực hiện trọn vẹn ký hiệu', title: 'Đang ghi' }
  }
  return { detail: 'Giữ tay ổn định', title: 'Chuẩn bị' }
}
