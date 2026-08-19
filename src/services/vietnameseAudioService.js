function fallbackSpeech(text) {
  try {
    if (!text?.trim() || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = "vi-VN";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const vietnameseVoice =
      voices.find(
        (voice) => voice.lang?.toLowerCase() === "vi-vn",
      ) ||
      voices.find((voice) =>
        voice.lang?.toLowerCase().startsWith("vi"),
      );

    if (vietnameseVoice) {
      utterance.voice = vietnameseVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Không thể phát giọng dự phòng:", error);
  }
}

export function stopGestureAudio() {
  try {
    window.speechSynthesis?.cancel();
  } catch (error) {
    console.error("Không thể dừng âm thanh:", error);
  }
}

export async function playGestureAudio(
  _gesture,
  fallbackText = "",
) {
  stopGestureAudio();
  fallbackSpeech(fallbackText);
  return Boolean(fallbackText?.trim());
}

export function replayGestureAudio(gesture, text) {
  return playGestureAudio(gesture, text);
}
