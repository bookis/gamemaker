import { useEditor } from './EditorProvider'
import type { EditorTool } from '../types/editor'

const TOOLS: { id: EditorTool; label: string; key: string }[] = [
  { id: 'paint', label: 'Paint', key: '1' },
  { id: 'erase', label: 'Erase', key: '2' },
  { id: 'fill', label: 'Fill', key: '3' },
  { id: 'select', label: 'Select', key: '4' },
  { id: 'object', label: 'Object', key: '5' },
]

type Props = {
  onSave: () => void
  onPlay: () => void
  onBack: () => void
  saving: boolean
}

export default function Toolbar({ onSave, onPlay, onBack, saving }: Props) {
  const { state, dispatch } = useEditor()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
      background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
    }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack}>&larr; Back</button>

      <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

      {TOOLS.map(tool => (
        <button
          key={tool.id}
          className={`btn btn-sm ${state.currentTool === tool.id ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: tool.id })}
          title={`${tool.label} (${tool.key})`}
        >
          {tool.label}
        </button>
      ))}

      <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

      <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'UNDO' })} title="Undo (Ctrl+Z)">
        Undo
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'REDO' })} title="Redo (Ctrl+Y)">
        Redo
      </button>

      <div style={{ flex: 1 }} />

      <select
        className="select"
        style={{ padding: '4px 8px', fontSize: 13 }}
        value={state.currentLayerIndex}
        onChange={e => dispatch({ type: 'SET_LAYER', index: Number(e.target.value) })}
      >
        {state.gameData.levels[state.currentLevelIndex]?.tileLayers.map((layer, i) => (
          <option key={i} value={i}>{layer.name}</option>
        ))}
      </select>

      <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

      <button className="btn btn-primary btn-sm" onClick={onPlay}>Play</button>
      <button
        className="btn btn-sm"
        style={{
          background: state.dirty ? 'var(--success)' : 'var(--bg-tertiary)',
          color: state.dirty ? '#fff' : 'var(--text-secondary)',
        }}
        onClick={onSave}
        disabled={saving || !state.dirty}
      >
        {saving ? 'Saving...' : state.dirty ? 'Save' : 'Saved'}
      </button>
    </div>
  )
}
