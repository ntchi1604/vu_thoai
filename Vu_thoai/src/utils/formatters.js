export function formatConfidence(value) {
  return `${Math.round(value * 100)}%`
}

export function formatTime(isoDate) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}
