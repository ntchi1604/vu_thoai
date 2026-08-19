import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelSpeech,
  createVietnameseUtterance,
  findVietnameseVoice,
  getAvailableVoices,
  isSpeechSynthesisSupported,
} from '../services/speechSynthesisService.js'

export function useSpeechSynthesis() {
  const utteranceRef = useRef(null)
  const lastSpokenRef = useRef({ text: '', timestamp: -Infinity })
  const [voices, setVoices] = useState([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechMessage, setSpeechMessage] = useState('')
  const isSupported = isSpeechSynthesisSupported()

  const vietnameseVoice = useMemo(() => findVietnameseVoice(voices), [voices])
  const hasVietnameseVoice = Boolean(vietnameseVoice)

  const refreshVoices = useCallback(() => {
    setVoices(getAvailableVoices())
  }, [])

  useEffect(() => {
    if (!isSupported) {
      setSpeechMessage('Trình duyệt không hỗ trợ phát âm thanh bằng Speech Synthesis.')
      return undefined
    }

    refreshVoices()
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices)
      cancelSpeech()
    }
  }, [isSupported, refreshVoices])

  useEffect(() => {
    if (!isSupported) {
      return
    }

    if (voices.length > 0 && !hasVietnameseVoice) {
      setSpeechMessage('Trình duyệt chưa cung cấp giọng tiếng Việt. App sẽ thử đọc với giọng mặc định.')
    } else if (hasVietnameseVoice) {
      setSpeechMessage(`Đã sẵn sàng giọng tiếng Việt: ${vietnameseVoice.name}.`)
    }
  }, [hasVietnameseVoice, isSupported, vietnameseVoice, voices.length])

  const stopSpeaking = useCallback(() => {
    cancelSpeech()
    utteranceRef.current = null
    setIsSpeaking(false)
  }, [])

  const speak = useCallback(
    (text) => {
      const normalizedText = text?.trim()

      if (!normalizedText) {
        setSpeechMessage('Chưa có câu hợp lệ để phát âm thanh.')
        return { ok: false }
      }

      if (!isSupported) {
        setSpeechMessage('Trình duyệt không hỗ trợ phát âm thanh bằng Speech Synthesis.')
        return { ok: false }
      }

      const now = performance.now()
      if (lastSpokenRef.current.text === normalizedText && now - lastSpokenRef.current.timestamp < 1200) {
        setSpeechMessage('Đã bỏ qua câu đọc lặp quá gần nhau.')
        return { ok: false }
      }

      cancelSpeech()
      lastSpokenRef.current = {
        text: normalizedText,
        timestamp: now,
      }

      const utterance = createVietnameseUtterance(normalizedText, vietnameseVoice)
      utteranceRef.current = utterance
      utterance.onstart = () => {
        setIsSpeaking(true)
        setSpeechMessage(
          vietnameseVoice
            ? `Đang đọc bằng giọng tiếng Việt: ${vietnameseVoice.name}.`
            : 'Đang đọc bằng giọng mặc định vì trình duyệt chưa có giọng tiếng Việt.',
        )
      }
      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null
          setIsSpeaking(false)
        }
      }
      utterance.onerror = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null
          setIsSpeaking(false)
          setSpeechMessage('Không thể phát âm thanh. Vui lòng thử lại.')
        }
      }

      window.speechSynthesis.speak(utterance)

      return { ok: true }
    },
    [isSupported, vietnameseVoice],
  )

  return {
    hasVietnameseVoice,
    isSpeaking,
    isSupported,
    speak,
    speechMessage,
    stopSpeaking,
  }
}
