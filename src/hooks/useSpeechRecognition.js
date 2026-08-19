import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition
}

export function useSpeechRecognition() {
  const recognitionRef = useRef(null)
  const shouldRestartRef = useRef(false)
  const [finalText, setFinalText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState('')

  const isSupported = useMemo(() => typeof window !== 'undefined' && Boolean(getSpeechRecognition()), [])

  useEffect(() => {
    if (!isSupported) {
      return undefined
    }

    const SpeechRecognition = getSpeechRecognition()
    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setSpeechError('')
    }

    recognition.onresult = (event) => {
      let nextFinal = ''
      let nextInterim = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript

        if (event.results[index].isFinal) {
          nextFinal += transcript
        } else {
          nextInterim += transcript
        }
      }

      if (nextFinal) {
        setFinalText((current) => `${current} ${nextFinal}`.trim())
      }

      setInterimText(nextInterim.trim())
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        shouldRestartRef.current = false
        setSpeechError('Bạn chưa cấp quyền micro. Hãy cho phép truy cập micro rồi thử lại.')
      } else if (event.error === 'audio-capture') {
        shouldRestartRef.current = false
        setSpeechError('Không tìm thấy micro. Vui lòng kiểm tra thiết bị rồi thử lại.')
      } else if (event.error === 'no-speech') {
        setSpeechError('Chưa nghe thấy giọng nói. Vui lòng nói rõ hơn hoặc thử lại.')
      } else {
        setSpeechError('Micro hoặc nhận diện giọng nói đang gặp lỗi. Vui lòng thử lại.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)

      if (shouldRestartRef.current) {
        try {
          recognition.start()
        } catch {
          setSpeechError('Không thể tiếp tục nghe. Vui lòng bấm bắt đầu lại.')
          shouldRestartRef.current = false
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      shouldRestartRef.current = false
      try {
        recognition.stop()
      } catch {
        recognition.abort()
      }
    }
  }, [isSupported])

  const startListening = useCallback(() => {
    setSpeechError('')

    if (!isSupported) {
      setSpeechError('Trình duyệt không hỗ trợ Web Speech Recognition. Hãy thử Chrome hoặc Edge.')
      return
    }

    shouldRestartRef.current = true

    try {
      recognitionRef.current.start()
    } catch {
      setSpeechError('Trình nhận diện đang chạy hoặc chưa sẵn sàng. Vui lòng thử lại.')
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {
      recognitionRef.current?.abort()
    }
    setIsListening(false)
  }, [])

  const clearTranscript = useCallback(() => {
    setFinalText('')
    setInterimText('')
    setSpeechError('')
  }, [])

  return {
    finalText,
    interimText,
    isListening,
    isSupported,
    speechError,
    startListening,
    stopListening,
    clearTranscript,
  }
}
