import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getStoredUser, login, register, logout, type User } from './lib/popdb'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import PlayPage from './pages/PlayPage'

type AuthContextType = {
  user: User | null
  setUser: (user: User | null) => void
  handleLogout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  handleLogout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <>{children}</>

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const result = await login(email, password)
        setUser(result.user)
      } else {
        const result = await register(email, password, displayName || undefined)
        setUser(result.user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: 380, padding: 32, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 28, marginBottom: 4, textAlign: 'center' }}>Game Maker</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, textAlign: 'center' }}>
          {mode === 'login' ? 'Sign in to continue' : 'Create an account'}
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <input
              className="input"
              placeholder="Display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          )}
          <input
            className="input"
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={{ background: 'none', color: 'var(--accent)', padding: 0 }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(getStoredUser)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  function handleLogout() {
    logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, handleLogout }}>
      <AuthGate>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/edit/:id" element={<EditorPage />} />
          <Route path="/play/:id" element={<PlayPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthGate>
    </AuthContext.Provider>
  )
}
