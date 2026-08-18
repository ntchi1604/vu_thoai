import { useCallback, useEffect, useRef, useState } from 'react'
import { TWO_HAND_SEQUENCE_CONFIG } from '../config/twoHandSequenceConfig.js'
import { getHandLandmarker } from '../services/handLandmarkerService.js'
import { getBoundingBox } from '../services/landmarkNormalizer.js'
import {
  normalizeGestureFrame,
  resampleSequence,
  gestureFrameVisualMotionDistance,
  twoHandFrameMotionDistance,
  TwoHandSequenceRecognizer,
} from '../services/twoHandSequenceClassifier.js'
import { clearHandCanvas, drawHandLandmarks } from '../utils/handDrawing.js'

const MODEL_STATUS = {
  idle: 'Chưa tải mô hình',
  loading: 'Đang tải mô hình',
  ready: 'Mô hình sẵn sàng',
  error: 'Không thể tải mô hình',
}

const DETECTION_STATUS = {
  waiting: 'Chưa có dữ liệu video',
  noHands: 'Không phát hiện bàn tay',
  handsDetected: 'Đã phát hiện bàn tay',
}

const UNKNOWN_GESTURE = 'UNKNOWN'

const emptyGestureInfo = {
  technicalGesture: UNKNOWN_GESTURE,
  stableGesture: UNKNOWN_GESTURE,
  stableForMs: 0,
  voteRatio: 0,
  isAnalyzing: false,
  isStable: false,
  phrase: '',
}

const emptyDebugInfo = {
  fingers: {},
  hands: [],
  primaryHand: '',
  rawGesture: UNKNOWN_GESTURE,
  stableGesture: UNKNOWN_GESTURE,
  voteCount: 0,
  frameWindowSize: 12,
  stableForMs: 0,
  unknownReason: '',
}

const emptySequenceRecording = {
  countdown: null,
  isRecording: false,
  label: '',
  phase: 'idle',
  progress: 0,
  status: '',
}

export function useHandLandmarker({
  isCameraOn,
  onGestureRecognized,
  sequenceTemplates = [],
  videoRef,
}) {
  const canvasRef = useRef(null)
  const landmarkerRef = useRef(null)
  const rafRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const isMountedRef = useRef(false)
  const sequenceRecognizerRef = useRef(new TwoHandSequenceRecognizer())
  const sequenceTemplatesRef = useRef(sequenceTemplates)
  const sequenceRecordingRef = useRef(null)
  const callbackRef = useRef(onGestureRecognized)
  const [modelStatus, setModelStatus] = useState(MODEL_STATUS.idle)
  const [detectionStatus, setDetectionStatus] = useState(DETECTION_STATUS.waiting)
  const [detectedHands, setDetectedHands] = useState(0)
  const [gestureInfo, setGestureInfo] = useState(emptyGestureInfo)
  const [debugInfo, setDebugInfo] = useState(emptyDebugInfo)
  const [landmarkerError, setLandmarkerError] = useState('')
  const [sequenceRecording, setSequenceRecording] = useState(emptySequenceRecording)

  useEffect(() => {
    callbackRef.current = onGestureRecognized
  }, [onGestureRecognized])

  useEffect(() => {
    sequenceTemplatesRef.current = sequenceTemplates
  }, [sequenceTemplates])

  const resetGestureState = useCallback(() => {
    sequenceRecognizerRef.current.reset()
    setGestureInfo(emptyGestureInfo)
    setDebugInfo(emptyDebugInfo)
  }, [])

  const finishSequenceRecording = useCallback((result, updateState = true) => {
    const recording = sequenceRecordingRef.current
    sequenceRecordingRef.current = null
    if (updateState) setSequenceRecording(emptySequenceRecording)
    recording?.resolve(result)
  }, [])

  const startSequenceRecording = useCallback(({ label, phrase }) => {
    if (sequenceRecordingRef.current) {
      return Promise.resolve({ ok: false, error: 'Đang ghi một mẫu khác.' })
    }

    return new Promise((resolve) => {
      sequenceRecordingRef.current = {
        armed: false,
        armedAt: 0,
        frames: [],
        handCount: 0,
        label,
        lastMotionAt: 0,
        lastProgressAt: 0,
        phrase,
        preRoll: [],
        previousFrame: null,
        resolve,
        setupMotionFrames: 0,
        countdownStartedAt: null,
        setupStableSince: null,
        startedAt: null,
      }
      sequenceRecognizerRef.current.reset()
      setSequenceRecording({
        countdown: null,
        isRecording: true,
        label,
        phase: 'positioning',
        progress: 0,
        status: 'Đưa một hoặc hai tay vào camera để bắt đầu.',
      })
    })
  }, [])

  const cancelSequenceRecording = useCallback(() => {
    finishSequenceRecording({ ok: false, error: 'Đã hủy ghi mẫu.' })
  }, [finishSequenceRecording])

  const processSequenceRecording = useCallback((frame, timestamp, handCount) => {
    const recording = sequenceRecordingRef.current
    if (!recording) return false

    if (frame && recording.startedAt === null && recording.handCount && recording.handCount !== handCount) {
      recording.armed = false
      recording.armedAt = 0
      recording.frames = []
      recording.handCount = handCount
      recording.preRoll = []
      recording.previousFrame = null
      recording.countdownStartedAt = null
      recording.setupMotionFrames = 0
      recording.setupStableSince = timestamp
    }

    const matchesRecordedHandCount = !recording.handCount || recording.handCount === handCount
    const usableFrame = frame && matchesRecordedHandCount ? frame : null

    if (!usableFrame) {
      if (recording.startedAt === null) {
        recording.armed = false
        recording.armedAt = 0
        recording.handCount = 0
        recording.preRoll = []
        recording.previousFrame = null
        recording.countdownStartedAt = null
        recording.setupMotionFrames = 0
        recording.setupStableSince = null
        setSequenceRecording({
          countdown: null,
          isRecording: true,
          label: recording.label,
          phase: 'positioning',
          progress: 0,
          status: 'Không thấy bàn tay phù hợp để ghi mẫu.',
        })
        return true
      }

      const elapsedMs = timestamp - recording.startedAt
      const motionEnded =
        elapsedMs >= TWO_HAND_SEQUENCE_CONFIG.recordingMinDurationMs &&
        timestamp - recording.lastMotionAt >= TWO_HAND_SEQUENCE_CONFIG.motionEndHoldMs
      if (!motionEnded && elapsedMs < TWO_HAND_SEQUENCE_CONFIG.recordingDurationMs) return true
    } else {
      if (!recording.handCount) recording.handCount = handCount

      const movement = recording.previousFrame
        ? twoHandFrameMotionDistance(usableFrame, recording.previousFrame)
        : 0
      const setupMovement = recording.previousFrame
        ? gestureFrameVisualMotionDistance(usableFrame, recording.previousFrame)
        : 0
      recording.previousFrame = usableFrame

      if (recording.startedAt === null) {
        if (!recording.armed) {
          if (recording.setupStableSince === null) recording.setupStableSince = timestamp
          if (setupMovement >= TWO_HAND_SEQUENCE_CONFIG.recordingReadyMotionThreshold) {
            recording.setupMotionFrames += 1
          } else {
            recording.setupMotionFrames = Math.max(0, recording.setupMotionFrames - 1)
          }

          if (recording.setupMotionFrames >= TWO_HAND_SEQUENCE_CONFIG.recordingReadyResetFrames) {
            recording.setupStableSince = timestamp
            recording.countdownStartedAt = null
            recording.setupMotionFrames = 0
          }

          const setupStableForMs = timestamp - recording.setupStableSince
          if (setupStableForMs < TWO_HAND_SEQUENCE_CONFIG.recordingReadyHoldMs) {
            if (timestamp - recording.lastProgressAt >= 80) {
              recording.lastProgressAt = timestamp
              setSequenceRecording({
                countdown: null,
                isRecording: true,
                label: recording.label,
                phase: 'positioning',
                progress: 0,
                status: 'Giữ tay ổn định ở tư thế chuẩn bị...',
              })
            }
            return true
          }

          if (recording.countdownStartedAt === null) {
            recording.countdownStartedAt = timestamp
          }
          const countdownElapsed = timestamp - recording.countdownStartedAt
          const countdownRemaining = Math.ceil(
            (TWO_HAND_SEQUENCE_CONFIG.recordingCountdownMs - countdownElapsed) / 1000,
          )
          if (countdownRemaining > 0) {
            if (timestamp - recording.lastProgressAt >= 80) {
              recording.lastProgressAt = timestamp
              setSequenceRecording({
                countdown: countdownRemaining,
                isRecording: true,
                label: recording.label,
                phase: 'countdown',
                progress: 0,
                status: `Chuẩn bị ghi sau ${countdownRemaining}...`,
              })
            }
            return true
          }

          recording.armed = true
          recording.armedAt = timestamp
          recording.preRoll = [usableFrame]
          setSequenceRecording({
            countdown: 0,
            isRecording: true,
            label: recording.label,
            phase: 'ready',
            progress: 0,
            status: 'Sẵn sàng, bắt đầu!',
          })
          return true
        }

        if (timestamp - recording.armedAt < TWO_HAND_SEQUENCE_CONFIG.recordingStartDelayMs) {
          recording.preRoll = [usableFrame]
          return true
        }

        recording.preRoll.push(usableFrame)
        if (recording.preRoll.length > TWO_HAND_SEQUENCE_CONFIG.targetFrames) {
          recording.preRoll.shift()
        }

        const heldLongEnough =
          timestamp - recording.armedAt >= TWO_HAND_SEQUENCE_CONFIG.recordingStaticHoldMs &&
          recording.preRoll.length >= TWO_HAND_SEQUENCE_CONFIG.minFrames
        if (movement < TWO_HAND_SEQUENCE_CONFIG.motionStartThreshold && !heldLongEnough) {
          if (timestamp - recording.lastProgressAt >= 80) {
            recording.lastProgressAt = timestamp
            setSequenceRecording({
              countdown: 0,
              isRecording: true,
              label: recording.label,
              phase: 'ready',
              progress: 0,
              status: 'Sẵn sàng, bắt đầu!',
            })
          }
          return true
        }

        recording.startedAt = timestamp
        recording.lastMotionAt = timestamp
        recording.frames = heldLongEnough
          ? [...recording.preRoll]
          : recording.preRoll.slice(-TWO_HAND_SEQUENCE_CONFIG.recordingPreRollFrames)
      } else {
        recording.frames.push(usableFrame)
        if (movement >= TWO_HAND_SEQUENCE_CONFIG.motionContinueThreshold) {
          recording.lastMotionAt = timestamp
        }
      }
    }

    const elapsedMs = timestamp - recording.startedAt

    if (timestamp - recording.lastProgressAt >= 80) {
      recording.lastProgressAt = timestamp
      setSequenceRecording({
        countdown: 0,
        isRecording: true,
        label: recording.label,
        phase: 'recording',
        progress: Math.min(1, elapsedMs / TWO_HAND_SEQUENCE_CONFIG.recordingDurationMs),
        status: usableFrame
          ? `Đang ghi ký hiệu ${recording.handCount} tay...`
          : 'Đang hoàn tất mẫu.',
      })
    }

    const motionEnded =
      elapsedMs >= TWO_HAND_SEQUENCE_CONFIG.recordingMinDurationMs &&
      timestamp - recording.lastMotionAt >= TWO_HAND_SEQUENCE_CONFIG.motionEndHoldMs
    if (!motionEnded && elapsedMs < TWO_HAND_SEQUENCE_CONFIG.recordingDurationMs) return true

    if (recording.frames.length < TWO_HAND_SEQUENCE_CONFIG.minFrames) {
      finishSequenceRecording({ ok: false, error: 'Không thu đủ frame bàn tay.' })
      return true
    }

    finishSequenceRecording({
      frames: resampleSequence(recording.frames),
      handCount: recording.handCount,
      label: recording.label,
      ok: true,
      phrase: recording.phrase,
    })
    return true
  }, [finishSequenceRecording])

  const stopDetection = useCallback(
    (resetState = true) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }

      lastVideoTimeRef.current = -1
      clearHandCanvas(canvasRef.current)

      if (sequenceRecordingRef.current) {
        finishSequenceRecording({ ok: false, error: 'Camera đã dừng.' }, isMountedRef.current)
      }

      if (resetState && isMountedRef.current) {
        setDetectedHands(0)
        setDetectionStatus(DETECTION_STATUS.waiting)
        resetGestureState()
      }
    },
    [finishSequenceRecording, resetGestureState],
  )

  const rearmRecognition = useCallback(() => {
    sequenceRecognizerRef.current.rearm()
  }, [])

  const syncCanvasToVideo = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current

    if (!canvas || !video || !video.videoWidth || !video.videoHeight) {
      return false
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    return true
  }, [videoRef])

  const updateHandState = useCallback(
    (result, timestamp) => {
      const hands = result.landmarks ?? []
      const handCount = hands.length
      const nextDetectionStatus =
        handCount > 0 ? DETECTION_STATUS.handsDetected : DETECTION_STATUS.noHands

      const motionHands = orderHandsForMotion(result, hands)
      const gestureHandCount = Math.min(2, motionHands.length)
      const sequenceFrame = normalizeGestureFrame(motionHands)

      setDetectedHands((current) => (current === handCount ? current : handCount))
      setDetectionStatus((current) => (current === nextDetectionStatus ? current : nextDetectionStatus))

      if (processSequenceRecording(sequenceFrame, timestamp, gestureHandCount)) {
        setGestureInfo({
          technicalGesture: 'RECORDING_GESTURE_SEQUENCE',
          stableGesture: UNKNOWN_GESTURE,
          stableForMs: 0,
          voteRatio: 0,
          isAnalyzing: true,
          isStable: false,
          phrase: '',
        })
        setDebugInfo({
          ...emptyDebugInfo,
          hands: hands.map((landmarks, index) => ({
            area: getBoundingBox(landmarks).area,
            handedness: getHandLabel(getHandedness(result, index)) || 'Không rõ',
            index,
            selected: true,
          })),
          primaryHand: 'Đang ghi ký hiệu',
          rawGesture: 'RECORDING_GESTURE_SEQUENCE',
        })
        return
      }

      const sequenceState = sequenceRecognizerRef.current.update(
        sequenceFrame,
        timestamp,
        sequenceTemplatesRef.current,
        gestureHandCount,
      )

      if (sequenceState.isAnalyzing || sequenceState.isActive) {
        const gesture = sequenceState.gesture
        const isActive = sequenceState.isActive
        const phrase = isActive ? sequenceState.phrase : ''
        setGestureInfo({
          technicalGesture: isActive ? gesture : 'LIBRARY_SEQUENCE',
          stableGesture: isActive ? gesture : UNKNOWN_GESTURE,
          stableForMs: sequenceState.durationMs,
          voteRatio: sequenceState.confidence,
          isAnalyzing: sequenceState.isAnalyzing,
          isStable: isActive,
          phrase,
        })

        if (sequenceState.shouldEmit && phrase) {
          callbackRef.current?.({ gesture, phrase })
        }

        setDebugInfo({
          fingers: {},
          hands: hands.map((landmarks, index) => ({
            area: getBoundingBox(landmarks).area,
            handedness: getHandLabel(getHandedness(result, index)) || 'Không rõ',
            index,
            selected: true,
          })),
          primaryHand: `${gestureHandCount} tay`,
          rawGesture: isActive ? gesture : 'LIBRARY_SEQUENCE_CANDIDATE',
          stableGesture: isActive ? gesture : UNKNOWN_GESTURE,
          voteCount: sequenceState.confirmations,
          frameWindowSize: sequenceState.sampleCount,
          stableForMs: sequenceState.durationMs,
          unknownReason: sequenceState.unknownReason,
        })
        return
      }

      const debugHands = hands.map((landmarks, index) => {
        const handedness = getHandedness(result, index)
        const bbox = getBoundingBox(landmarks)

        return {
          area: bbox.area,
          handedness: getHandLabel(handedness) || 'Không rõ',
          index,
          selected: true,
        }
      })

      setGestureInfo(emptyGestureInfo)
      setDebugInfo({
        ...emptyDebugInfo,
        hands: debugHands,
        primaryHand: handCount > 0 ? `${gestureHandCount} tay` : 'Không có',
        unknownReason: handCount > 0 ? 'Không khớp ký hiệu nào trong thư viện.' : '',
      })
    },
    [processSequenceRecording],
  )

  const detectFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current

    if (!isCameraOn || !video || !canvas || !landmarker) {
      return
    }

    if (syncCanvasToVideo() && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime

        const timestamp = performance.now()
        const result = landmarker.detectForVideo(video, timestamp)
        const hands = result.landmarks ?? []
        drawHandLandmarks(canvas, hands)
        updateHandState(result, timestamp)
      }
    }

    rafRef.current = requestAnimationFrame(detectFrame)
  }, [isCameraOn, syncCanvasToVideo, updateHandState, videoRef])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      stopDetection(false)
    }
  }, [stopDetection])

  useEffect(() => {
    let cancelled = false

    async function loadModel() {
      setModelStatus(MODEL_STATUS.loading)
      setLandmarkerError('')

      try {
        const landmarker = await getHandLandmarker()

        if (cancelled || !isMountedRef.current) {
          return
        }

        landmarkerRef.current = landmarker
        setModelStatus(MODEL_STATUS.ready)
      } catch (error) {
        if (cancelled || !isMountedRef.current) {
          return
        }

        console.error('Không thể tải MediaPipe Hand Landmarker.', error)
        setModelStatus(MODEL_STATUS.error)
        setLandmarkerError(
          'Không thể tải MediaPipe Hand Landmarker. Vui lòng kiểm tra kết nối mạng rồi tải lại trang.',
        )
      }
    }

    loadModel()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    stopDetection()

    if (!isCameraOn || modelStatus !== MODEL_STATUS.ready) {
      return undefined
    }

    rafRef.current = requestAnimationFrame(detectFrame)

    return stopDetection
  }, [detectFrame, isCameraOn, modelStatus, stopDetection])

  return {
    cancelSequenceRecording,
    canvasRef,
    detectedHands,
    detectionStatus,
    debugInfo,
    gestureInfo,
    landmarkerError,
    modelStatus,
    rearmRecognition,
    sequenceRecording,
    startSequenceRecording,
  }
}

function getHandedness(result, index) {
  const handednessGroup = result.handedness?.[index] ?? result.handednesses?.[index]
  return Array.isArray(handednessGroup) ? handednessGroup[0] : handednessGroup
}

function getHandLabel(handedness) {
  return handedness?.categoryName ?? handedness?.displayName ?? ''
}

function orderHandsForMotion(result, hands) {
  return hands
    .map((landmarks, index) => ({
      index,
      label: getHandLabel(getHandedness(result, index)).toLowerCase(),
      landmarks,
    }))
    .sort((a, b) => {
      if (a.label === b.label) return a.index - b.index
      if (a.label.includes('left')) return -1
      if (b.label.includes('left')) return 1
      return a.index - b.index
    })
    .map((hand) => hand.landmarks)
}
