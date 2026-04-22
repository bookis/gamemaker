import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGame, updateGame } from '../lib/api'
import type { GameDefinition } from '../types/game'
import { EditorProvider, useEditor } from '../editor/EditorProvider'
import Toolbar from '../editor/Toolbar'
import TilePalette from '../editor/TilePalette'
import ObjectPalette from '../editor/ObjectPalette'
import PropertyPanel from '../editor/PropertyPanel'
import EditorCanvas from '../editor/EditorCanvas'
import LevelTabs from '../editor/LevelTabs'
import PlayCanvas from '../components/PlayCanvas'

function EditorInner({ gameId }: { gameId: string }) {
  const navigate = useNavigate()
  const { state, dispatch } = useEditor()
  const [saving, setSaving] = useState(false)
  const [playing, setPlaying] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateGame(gameId, { game_data: state.gameData })
      dispatch({ type: 'MARK_CLEAN' })
    } finally {
      setSaving(false)
    }
  }, [gameId, state.gameData, dispatch])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' })
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      } else if (e.key === '1') dispatch({ type: 'SET_TOOL', tool: 'paint' })
      else if (e.key === '2') dispatch({ type: 'SET_TOOL', tool: 'erase' })
      else if (e.key === '3') dispatch({ type: 'SET_TOOL', tool: 'fill' })
      else if (e.key === '4') dispatch({ type: 'SET_TOOL', tool: 'select' })
      else if (e.key === '5') dispatch({ type: 'SET_TOOL', tool: 'object' })
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedPlacedObjectId) {
          dispatch({ type: 'REMOVE_OBJECT', objectId: state.selectedPlacedObjectId })
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dispatch, handleSave, state.selectedPlacedObjectId])

  if (playing) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '8px 16px', background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
        }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPlaying(false)}>
            &larr; Back to Editor
          </button>
          <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontSize: 13 }}>
            Test Play | R to restart | Esc to exit
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
          <PlayCanvas
            gameData={state.gameData}
            onExit={() => setPlaying(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        onSave={handleSave}
        onPlay={() => setPlaying(true)}
        onBack={() => navigate('/')}
        saving={saving}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar - palettes */}
        <div style={{
          width: 160, padding: 12, background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <TilePalette />
          <ObjectPalette />
        </div>

        {/* Canvas */}
        <EditorCanvas />

        {/* Right sidebar - properties */}
        <div style={{
          width: 200, background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)', overflowY: 'auto',
        }}>
          <PropertyPanel />
        </div>
      </div>
      <LevelTabs />
    </div>
  )
}

export default function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [gameData, setGameData] = useState<GameDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getGame(id)
      .then(record => setGameData(record.game_data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    )
  }

  if (error || !gameData || !id) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error || 'Game not found'}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>Back</button>
      </div>
    )
  }

  return (
    <EditorProvider gameData={gameData}>
      <EditorInner gameId={id} />
    </EditorProvider>
  )
}
