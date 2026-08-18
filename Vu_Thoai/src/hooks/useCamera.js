import { useCallback, useEffect, useRef, useState } from 'react'

const AUTO_RECONNECT_MS = 2000

export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const retryTimerRef = useRef(null)
  const isRetryingRef = useRef(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const startCamera = useCallback(async () => {
    setCameraError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ truy cập camera.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (streamRef.current === stream && !isRetryingRef.current) {
            isRetryingRef.current = true
            retryTimerRef.current = setTimeout(() => {
              isRetryingRef.current = false
              if (streamRef.current === stream) {
                startCamera()
              }
            }, AUTO_RECONNECT_MS)
          }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setIsCameraOn(true)
    } catch (error) {
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
      setCameraError(
        denied
          ? 'Bạn chưa cấp quyền camera. Hãy cho phép truy cập camera rồi thử lại.'
          : 'Không thể mở camera. Vui lòng kiểm tra thiết bị hoặc quyền truy cập.',
      )
      setIsCameraOn(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    clearTimeout(retryTimerRef.current)
    isRetryingRef.current = false
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCameraOn(false)
  }, [])

  useEffect(() => () => {
    clearTimeout(retryTimerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  return {
    videoRef,
    isCameraOn,
    cameraError,
    startCamera,
    stopCamera,
  }
}
