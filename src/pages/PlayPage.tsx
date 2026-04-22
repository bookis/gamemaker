import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGame } from '../lib/api'
import type { GameDefinition } from '../types/game'
import type { GameState } from '../types/engine'
import PlayCanvas from '../components/PlayCanvas'

export default function PlayPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [gameData, setGameData] = useState<GameDefinition | null>(null)
  const [gameName, setGameName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gameState, setGameState] = useState<GameState>('playing')
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (!id) return
    getGame(id)
      .then(record => {
        setGameData(record.game_data)
        setGameName(record.name)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  function handleStateChange(state: GameState, newScore: number) {
    setGameState(state)
    setScore(newScore)
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    )
  }

  if (error || !gameData) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error || 'Game not found'}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>Back</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px',
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/edit/${id}`)}>
          &larr; Editor
        </button>
        <h2 style={{ fontSize: 16, flex: 1 }}>{gameName}</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Score: {score} | {gameState === 'won' ? 'Won!' : gameState === 'lost' ? 'Lost' : 'Playing'}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Arrow keys to move | R to restart | Esc to exit
        </span>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PlayCanvas
          gameData={gameData}
          onStateChange={handleStateChange}
          onExit={() => navigate(`/edit/${id}`)}
        />
      </div>
    </div>
  )
}
