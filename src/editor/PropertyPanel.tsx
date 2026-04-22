import { useEditor } from './EditorProvider'

export default function PropertyPanel() {
  const { state, dispatch, currentLevel } = useEditor()

  if (!state.selectedPlacedObjectId) {
    return (
      <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
        Select an object to edit its properties
      </div>
    )
  }

  const obj = currentLevel.objects.find(o => o.id === state.selectedPlacedObjectId)
  if (!obj) return null

  const def = state.gameData.objectDefs.find(d => d.id === obj.defId)
  if (!def) return null

  const allProps = { ...def.defaultProperties, ...obj.properties }

  function updateProp(key: string, value: string | number | boolean) {
    dispatch({
      type: 'UPDATE_OBJECT_PROPS',
      objectId: state.selectedPlacedObjectId!,
      properties: { [key]: value },
    })
  }

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
        Properties
      </h3>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 4, background: def.spriteColor }} />
          <span style={{ fontWeight: 600 }}>{def.name}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Position: ({obj.x}, {obj.y})
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(allProps).map(([key, value]) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
              {key}
            </label>
            {typeof value === 'boolean' ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={e => updateProp(key, e.target.checked)}
                />
                {value ? 'Yes' : 'No'}
              </label>
            ) : typeof value === 'number' ? (
              <input
                className="input"
                type="number"
                style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
                value={value}
                onChange={e => updateProp(key, Number(e.target.value))}
              />
            ) : (
              <input
                className="input"
                style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
                value={value}
                onChange={e => updateProp(key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <button
        className="btn btn-danger btn-sm"
        style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
        onClick={() => dispatch({ type: 'REMOVE_OBJECT', objectId: obj.id })}
      >
        Delete Object
      </button>
    </div>
  )
}
