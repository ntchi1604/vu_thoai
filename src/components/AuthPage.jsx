import { ArrowRight, Envelope, Eye, EyeSlash, HandWaving, LockKey, SignIn } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { StatusMessage } from './StatusMessage.jsx'

const ERROR_MESSAGES = {
  'Invalid login credentials': 'Email hoặc mật khẩu không đúng.',
  'User already registered': 'Email đã được đăng ký.',
  'Email not confirmed': 'Vui lòng xác nhận email qua liên kết đã gửi.',
}

function translateError(message) {
  return ERROR_MESSAGES[message] ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.'
}

export function AuthPage() {
  const reduce = useReducedMotion()
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus(null)
    setBusy(true)

    const action = mode === 'login' ? signIn : signUp
    const { error } = await action(email.trim(), password)

    setBusy(false)
    if (error) {
      setStatus({ message: translateError(error.message), tone: 'error' })
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-brand">
          <span className="brand-symbol" aria-hidden="true">
            <HandWaving size={38} weight="duotone" />
          </span>
          <h1>Vũ Thoại</h1>
          <p>{isLogin ? 'Đăng nhập để mở thư viện ký hiệu của bạn' : 'Tạo tài khoản để bắt đầu thư viện ký hiệu riêng'}</p>
        </div>

        <div className="auth-mode-toggle" role="tablist" aria-label="Chế độ đăng nhập">
          <button
            aria-selected={isLogin}
            className={isLogin ? 'is-active' : ''}
            onClick={() => { setMode('login'); setStatus(null) }}
            role="tab"
            type="button"
          >
            Đăng nhập
          </button>
          <button
            aria-selected={!isLogin}
            className={!isLogin ? 'is-active' : ''}
            onClick={() => { setMode('signup'); setStatus(null) }}
            role="tab"
            type="button"
          >
            Đăng ký
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <span className="auth-input-wrap">
              <Envelope size={18} weight="duotone" aria-hidden="true" />
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ban@vidu.vn"
                required
                type="email"
                value={email}
              />
            </span>
          </label>

          <label className="auth-field">
            <span>Mật khẩu</span>
            <span className="auth-input-wrap">
              <LockKey size={18} weight="duotone" aria-hidden="true" />
              <input
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ít nhất 6 ký tự"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="auth-eye-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <StatusMessage tone={status?.tone}>{status?.message}</StatusMessage>

          <button className="auth-submit" disabled={busy} type="submit">
            {isLogin ? <SignIn size={18} weight="bold" /> : <ArrowRight size={18} weight="bold" />}
            {busy ? 'Đang xử lý…' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
