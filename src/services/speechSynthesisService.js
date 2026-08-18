export function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function getAvailableVoices() {
  if (!isSpeechSynthesisSupported()) {
    return []
  }

  return window.speechSynthesis.getVoices()
}

export function findVietnameseVoice(voices) {
  return (
    voices.find((voice) => voice.lang === 'vi-VN') ??
    voices.find((voice) => voice.lang?.toLowerCase().startsWith('vi')) ??
    null
  )
}

export function createVietnameseUtterance(text, voice) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = voice?.lang || 'vi-VN'
  utterance.rate = 0.9
  utterance.pitch = 1
  utterance.volume = 1

  if (voice) {
    utterance.voice = voice
  }

  return utterance
}

export function cancelSpeech() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
  }
}
