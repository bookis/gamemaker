import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { getGames, createGame, deleteGame } from '../lib/api'
import GameCard from '../components/GameCard'
import type { GameRecord, GameType } from '../types/game'

export default function HomePage() {
  const { user, handleLogout } = useAuth()
  const [games, setGames] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<GameType>('platformer')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadGames()
  }, [])

  async function loadGames() {
    try {
      const data = await getGames()
      setGames(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const game = await createGame(user.id, newName.trim(), newType)
      setGames(prev => [game, ...prev])
      setNewName('')
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteGame(id)
    setGames(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 32 }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 28 }}>Game Maker</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Create platformers, top-down adventures, and puzzles
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div style={{ marginBottom: 24 }}>
        {!showCreate ? (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Game
          </button>
        ) : (
          <form onSubmit={handleCreate} style={{
            display: 'flex', gap: 12, alignItems: 'flex-end',
            padding: 20, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Name</label>
              <input
                className="input"
                style={{ width: '100%' }}
                placeholder="My Awesome Game"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Type</label>
              <select className="select" value={newType} onChange={e => setNewType(e.target.value as GameType)}>
                <option value="platformer">Platformer</option>
                <option value="topdown">Top-Down Adventure</option>
                <option value="puzzle">Puzzle</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? '...' : 'Create'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>}
          </form>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>Loading...</p>
      ) : games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No games yet</p>
          <p>Create your first game to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {games.map(game => (
            <GameCard key={game.id} game={game} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
