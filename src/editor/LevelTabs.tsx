import { useEditor } from './EditorProvider'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export default function LevelTabs() {
  const { state, dispatch } = useEditor()
  const levels = state.gameData.levels

  function addLevel() {
    const level = levels[0]!
    dispatch({
      type: 'ADD_LEVEL',
      level: {
        id: generateId(),
        name: `Level ${levels.length + 1}`,
        width: level.width,
        height: level.height,
        tileLayers: level.tileLayers.map(l => ({
          ...l,
          data: new Array(level.width * level.height).fill(0),
        })),
        objects: [],
      },
    })
  }

  function renameLevel(index: number) {
    const name = prompt('Level name:', levels[index]!.name)
    if (name) dispatch({ type: 'RENAME_LEVEL', index, name })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '6px 16px',
      background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
      overflowX: 'auto',
    }}>
      {levels.map((level, i) => (
        <div
          key={level.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
            background: i === state.currentLevelIndex ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: i === state.currentLevelIndex ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <span onClick={() => dispatch({ type: 'SET_LEVEL', index: i })}>
            {level.name}
          </span>
          <span
            onClick={() => renameLevel(i)}
            style={{ opacity: 0.5, cursor: 'pointer', fontSize: 10 }}
            title="Rename"
          >
            ...
          </span>
          {levels.length > 1 && (
            <span
              onClick={() => { if (confirm(`Delete "${level.name}"?`)) dispatch({ type: 'REMOVE_LEVEL', index: i }) }}
              style={{ opacity: 0.5, cursor: 'pointer', fontSize: 10 }}
              title="Delete level"
            >
              x
            </span>
          )}
        </div>
      ))}
      <button
        className="btn btn-ghost btn-sm"
        style={{ padding: '4px 10px', fontSize: 13 }}
        onClick={addLevel}
      >
        +
      </button>
    </div>
  )
}
