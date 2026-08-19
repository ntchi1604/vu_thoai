import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { AuthPage } from './components/AuthPage.jsx'
import { ConversationHistory } from './components/ConversationHistory.jsx'
import { Header } from './components/Header.jsx'
import { LandingPage } from './components/LandingPage.jsx'
import { SignToTextPanel } from './components/SignToTextPanel.jsx'
import { SpeechToTextPanel } from './components/SpeechToTextPanel.jsx'
import { useAuth } from './hooks/useAuth.js'

const HISTORY_STORAGE_KEY = 'signbridge.conversationHistory'
const MAX_HISTORY_ITEMS = 20
const LEGACY_LIBRARY_DATABASE_NAME = 'vu-thoai-sequence-library'

function loadConversationHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : []
  } catch {
    return []
  }
}

function deleteLegacyLibraryDatabase() {
  try {
    indexedDB.deleteDatabase(LEGACY_LIBRARY_DATABASE_NAME)
  } catch (error) {
    console.error('Không thể xóa thư viện cũ.', error)
  }
}

export default function App() {
  const reduce = useReducedMotion()
  const { loading, session, signOut } = useAuth()
  const [history, setHistory] = useState(loadConversationHistory)
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).has('tool') ? 'tool' : 'landing')

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  }, [history])

  useEffect(() => {
    function handleNavigation() {
      setView(new URLSearchParams(window.location.search).has('tool') ? 'tool' : 'landing')
    }

    window.addEventListener('popstate', handleNavigation)
    return () => window.removeEventListener('popstate', handleNavigation)
  }, [])

  const navigateToTool = useCallback((replace = false) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tool', '1')
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url)
    setView('tool')
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [reduce])

  function navigateToLanding() {
    const url = new URL(window.location.href)
    url.searchParams.delete('tool')
    window.history.pushState({}, '', url)
    setView('landing')
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    if (session) {
      deleteLegacyLibraryDatabase()
      if (view === 'auth') {
        navigateToTool(true)
      }
    }
  }, [session, view, navigateToTool])

  function handleOpenTool() {
    if (session) {
      navigateToTool()
      return
    }
    setView('auth')
  }

  async function handleLogout() {
    await signOut()
    setView('landing')
  }

  function addHistoryItem(item) {
    setHistory((current) => [
      { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...item },
      ...current,
    ].slice(0, MAX_HISTORY_ITEMS))
  }

  if (loading) {
    return <div className="auth-page"><div className="auth-loading" role="status">Đang kiểm tra phiên đăng nhập…</div></div>
  }

  if (view === 'tool' && session) {
    return (
    <div className="app-shell">
      <div className="app-frame">
        <Header onBack={navigateToLanding} onLogout={handleLogout} user={session.user} />

        <motion.main
          className="workspace-grid"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <section className="tool-panel sign-panel" aria-label="Ký hiệu sang văn bản">
            <SignToTextPanel onAddHistory={addHistoryItem} />
          </section>

          <section className="tool-panel speech-panel" aria-label="Giọng nói sang văn bản">
            <SpeechToTextPanel onAddHistory={addHistoryItem} />
          </section>

          <aside className="tool-panel history-panel">
            <ConversationHistory items={history} onClear={() => setHistory([])} />
          </aside>
        </motion.main>
      </div>
    </div>
    )
  }

  if (view === 'auth' && !session) {
    return <AuthPage />
  }

  return <LandingPage onOpenTool={handleOpenTool} />
}
