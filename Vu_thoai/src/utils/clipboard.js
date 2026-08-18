export async function copyText(text) {
  if (!text?.trim()) {
    return { ok: false, message: 'Chưa có nội dung để sao chép.' }
  }

  if (!navigator.clipboard) {
    return { ok: false, message: 'Trình duyệt không hỗ trợ sao chép tự động.' }
  }

  try {
    await navigator.clipboard.writeText(text)
    return { ok: true, message: 'Đã sao chép văn bản.' }
  } catch {
    return { ok: false, message: 'Không thể sao chép. Vui lòng thử lại.' }
  }
}
