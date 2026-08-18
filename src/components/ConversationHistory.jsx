import { HandWaving, Microphone, Trash } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { formatTime } from '../utils/formatters.js'

const MESSAGE_LABELS = {
  sign: 'Ký hiệu',
  speech: 'Giọng nói',
}

export function ConversationHistory({ items, onClear }) {
  const reduce = useReducedMotion()

  return (
    <section className="history-content" aria-labelledby="history-title">
      <div className="history-heading">
        <h2 className="panel-title" id="history-title">Session History</h2>
        <button className="icon-command" disabled={items.length === 0} onClick={onClear} title="Xóa toàn bộ nhật ký" type="button">
          <Trash size={15} weight="regular" aria-hidden="true" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="history-empty">
          <Microphone size={38} weight="duotone" aria-hidden="true" />
          <strong>Chưa có nội dung trong phiên</strong>
          <p>Kết quả từ camera hoặc micro sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <motion.ol
          className="history-list"
          initial={reduce ? false : 'hidden'}
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
        >
          {items.map((item) => {
            const label = MESSAGE_LABELS[item.type] ?? MESSAGE_LABELS.sign
            const message = item.type === 'sign' && item.gesture
              ? `Cử chỉ: ${item.gesture} → ${item.text}`
              : `“${item.text}”`

            return (
              <motion.li
                className="history-entry"
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 7 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
                }}
              >
                <div className={`history-source-icon history-source-${item.type}`} aria-hidden="true">
                  {item.type === 'sign'
                    ? <HandWaving size={20} weight="duotone" />
                    : <Microphone size={20} weight="duotone" />}
                </div>
                <div className="history-entry-body">
                  <div className="history-entry-meta">
                    <span>Đang nói</span>
                    <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
                  </div>
                  <p><strong>{label}</strong><br />{message}</p>
                </div>
              </motion.li>
            )
          })}
        </motion.ol>
      )}
    </section>
  )
}
