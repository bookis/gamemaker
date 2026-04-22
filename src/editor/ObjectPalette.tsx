import { useState } from 'react'
import { useEditor } from './EditorProvider'
import SpriteEditor from './SpriteEditor'
import type { ObjectCategory } from '../types/game'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

const CATEGORIES: { value: ObjectCategory; label: string }[] = [
  { value: 'player', label: 'Player' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'collectible', label: 'Collectible' },
  { value: 'trigger', label: 'Trigger' },
  { value: 'decoration', label: 'Decoration' },
]

const RANDOM_COLORS = ['#ff004d', '#ffa300', '#00e436', '#29adff', '#ff77a8', '#ffccaa', '#7e2553', '#ab5236']

export default function ObjectPalette() {
  const { state, dispatch } = useEditor()
  const objectDefs = state.gameData.objectDefs
  const [editingDefId, setEditingDefId] = useState<string | null>(null)
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<ObjectCategory>('decoration')

  const editingDef = editingDefId ? objectDefs.find(d => d.id === editingDefId) : null
  const editingMeta = editingMetaId ? objectDefs.find(d => d.id === editingMetaId) : null
  const spriteRes = Math.min(state.gameData.settings.tileSize, 32)

  function handleCreate() {
    if (!newName.trim()) return
    const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]!
    dispatch({
      type: 'ADD_OBJECT_DEF',
      def: {
        id: generateId(),
        name: newName.trim(),
        category: newCategory,
        spriteColor: color,
        width: 1,
        height: 1,
        defaultProperties: newCategory === 'enemy'
          ? { speed: 1, direction: 'left' }
          : newCategory === 'collectible'
            ? { scoreValue: 10 }
            : newCategory === 'trigger'
              ? { targetLevel: '' }
              : {},
      },
    })
    setNewName('')
    setShowCreate(false)
  }

  function handleDelete(defId: string) {
    const def = objectDefs.find(d => d.id === defId)
    if (!def) return
    if (!confirm(`Delete "${def.name}"? All placed instances will be removed.`)) return
    dispatch({ type: 'REMOVE_OBJECT_DEF', defId })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          Objects
        </h3>
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: '2px 6px', fontSize: 11 }}
          onClick={() => setShowCreate(!showCreate)}
          title="Create custom object"
        >
          +
        </button>
      </div>

      {showCreate && (
        <div style={{
          padding: 8, marginBottom: 8, background: 'var(--bg-tertiary)',
          borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <input
            className="input"
            style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
            placeholder="Name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          />
          <select
            className="select"
            style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
            value={newCategory}
            onChange={e => setNewCategory(e.target.value as ObjectCategory)}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1, padding: '3px 0', fontSize: 11, justifyContent: 'center' }}
              onClick={handleCreate}
            >
              Add
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '3px 6px', fontSize: 11 }}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {objectDefs.map(def => (
          <div
            key={def.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px',
              background: state.selectedObjectDefId === def.id ? 'var(--accent)' : 'transparent',
              borderRadius: 4,
            }}
          >
            <div
              onClick={() => dispatch({ type: 'SET_OBJECT_DEF', defId: def.id })}
              style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, cursor: 'pointer' }}
            >
              {def.spriteDataUrl ? (
                <img src={def.spriteDataUrl} style={{ width: 18, height: 18, imageRendering: 'pixelated', borderRadius: 2, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: 2, background: def.spriteColor, flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: state.selectedObjectDefId === def.id ? '#fff' : 'var(--text-primary)',
              }}>
                {def.name}
              </span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setEditingDefId(def.id) }}
              title="Draw sprite"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px',
                color: state.selectedObjectDefId === def.id ? '#fffa' : 'var(--text-muted)',
                fontSize: 9, flexShrink: 0,
              }}
            >
              art
            </button>
            <button
              onClick={e => { e.stopPropagation(); setEditingMetaId(editingMetaId === def.id ? null : def.id) }}
              title="Edit properties"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px',
                color: state.selectedObjectDefId === def.id ? '#fffa' : 'var(--text-muted)',
                fontSize: 9, flexShrink: 0,
              }}
            >
              ...
            </button>
          </div>
        ))}
      </div>

      {/* Inline editor for object definition metadata */}
      {editingMeta && (
        <div style={{
          marginTop: 8, padding: 8, background: 'var(--bg-tertiary)',
          borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Edit: {editingMeta.name}</div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Name</label>
            <input
              className="input"
              style={{ width: '100%', padding: '3px 6px', fontSize: 12 }}
              value={editingMeta.name}
              onChange={e => dispatch({ type: 'UPDATE_OBJECT_DEF', defId: editingMeta.id, updates: { name: e.target.value } })}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Category</label>
            <select
              className="select"
              style={{ width: '100%', padding: '3px 6px', fontSize: 12 }}
              value={editingMeta.category}
              onChange={e => dispatch({ type: 'UPDATE_OBJECT_DEF', defId: editingMeta.id, updates: { category: e.target.value as ObjectCategory } })}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Width</label>
              <input
                className="input"
                type="number"
                min={1}
                max={4}
                style={{ width: '100%', padding: '3px 6px', fontSize: 12 }}
                value={editingMeta.width}
                onChange={e => dispatch({ type: 'UPDATE_OBJECT_DEF', defId: editingMeta.id, updates: { width: Number(e.target.value) } })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Height</label>
              <input
                className="input"
                type="number"
                min={1}
                max={4}
                style={{ width: '100%', padding: '3px 6px', fontSize: 12 }}
                value={editingMeta.height}
                onChange={e => dispatch({ type: 'UPDATE_OBJECT_DEF', defId: editingMeta.id, updates: { height: Number(e.target.value) } })}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Color (fallback)</label>
            <input
              type="color"
              value={editingMeta.spriteColor}
              onChange={e => dispatch({ type: 'UPDATE_OBJECT_DEF', defId: editingMeta.id, updates: { spriteColor: e.target.value } })}
              style={{ width: '100%', height: 24, border: 'none', cursor: 'pointer', borderRadius: 4 }}
            />
          </div>
          {/* Custom properties editor */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Default Properties</label>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 10, cursor: 'pointer', padding: 0 }}
                onClick={() => {
                  const key = prompt('Property name:')
                  if (!key) return
                  const val = prompt('Default value (number, true/false, or text):')
                  if (val === null) return
                  let parsed: string | number | boolean = val
                  if (val === 'true') parsed = true
                  else if (val === 'false') parsed = false
                  else if (!isNaN(Number(val)) && val !== '') parsed = Number(val)
                  dispatch({
                    type: 'UPDATE_OBJECT_DEF',
                    defId: editingMeta.id,
                    updates: { defaultProperties: { ...editingMeta.defaultProperties, [key]: parsed } },
                  })
                }}
              >
                + add
              </button>
            </div>
            {Object.entries(editingMeta.defaultProperties).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 40 }}>{key}</span>
                <input
                  className="input"
                  style={{ flex: 1, padding: '2px 4px', fontSize: 11 }}
                  value={String(value)}
                  onChange={e => {
                    let v: string | number | boolean = e.target.value
                    if (v === 'true') v = true
                    else if (v === 'false') v = false
                    else if (!isNaN(Number(v)) && v !== '') v = Number(v)
                    dispatch({
                      type: 'UPDATE_OBJECT_DEF',
                      defId: editingMeta.id,
                      updates: { defaultProperties: { ...editingMeta.defaultProperties, [key]: v } },
                    })
                  }}
                />
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 10, cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    const props = { ...editingMeta.defaultProperties }
                    delete props[key]
                    dispatch({ type: 'UPDATE_OBJECT_DEF', defId: editingMeta.id, updates: { defaultProperties: props } })
                  }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, padding: '3px 0', fontSize: 11, justifyContent: 'center' }}
              onClick={() => setEditingMetaId(null)}
            >
              Done
            </button>
            <button
              className="btn btn-sm"
              style={{ padding: '3px 8px', fontSize: 11, background: 'var(--danger)', color: '#fff' }}
              onClick={() => { handleDelete(editingMeta.id); setEditingMetaId(null) }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {editingDef && (
        <SpriteEditor
          width={spriteRes}
          height={spriteRes * editingDef.height}
          onSave={(dataUrl) => {
            dispatch({
              type: 'UPDATE_OBJECT_DEF',
              defId: editingDef.id,
              updates: { spriteDataUrl: dataUrl },
            })
            setEditingDefId(null)
          }}
          onCancel={() => setEditingDefId(null)}
        />
      )}
    </div>
  )
}
