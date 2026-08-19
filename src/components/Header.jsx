import { ArrowLeft, HandWaving, SignOut, Tag, UserCircle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export function Header({ onBack, onLogout, user }) {
  const reduce = useReducedMotion()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const email = user?.email ?? ''

  return (
    <motion.header
      className="app-header"
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <button className="tool-back-button" onClick={onBack} type="button">
        <ArrowLeft size={17} weight="bold" />
        Trang chủ
      </button>
      <div className="brand-lockup">
        <div className="brand-symbol" aria-hidden="true">
          <HandWaving size={43} weight="duotone" />
        </div>
        <h1>Vũ Thoại</h1>
      </div>
      <p className="brand-description">Ứng dụng Chuyển đổi Ngôn ngữ Ký hiệu - Giọng nói - Văn bản Tiếng Việt</p>
      <span className="edition-badge"><Tag size={13} weight="fill" />Community Edition</span>

      {user && (
        <div className="user-menu" ref={menuRef}>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className="user-chip"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <span className="user-avatar" aria-hidden="true">
              {email.charAt(0).toUpperCase() || <UserCircle size={17} />}
            </span>
            <span className="user-email">{email}</span>
          </button>
          {isMenuOpen && (
            <div className="user-dropdown" role="menu">
              <button className="user-dropdown-item" onClick={onLogout} role="menuitem" type="button">
                <SignOut size={16} weight="bold" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      )}
    </motion.header>
  )
}
