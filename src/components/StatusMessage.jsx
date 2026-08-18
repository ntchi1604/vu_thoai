import { Info, WarningCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'

export function StatusMessage({ children, tone = 'info' }) {
  if (!children) {
    return null
  }

  const isError = tone === 'error'
  const Icon = isError ? WarningCircle : Info

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`status-message ${isError ? 'status-error' : 'status-info'}`}
        role={isError ? 'alert' : 'status'}
      >
        <Icon size={18} weight="duotone" aria-hidden="true" />
        <p>{children}</p>
      </motion.div>
    </AnimatePresence>
  )
}
