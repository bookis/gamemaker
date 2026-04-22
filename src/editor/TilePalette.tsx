import { useRef, useEffect, useState } from 'react'
import { useEditor } from './EditorProvider'
import SpriteEditor from './SpriteEditor'

export default function TilePalette() {
  const { state, dispatch } = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tileset = state.gameData.tileset
  const tileCount = tileset.columns
  const [editingTile, setEditingTile] = useState<number | null>(null)

  const ts = tileset.tileWidth

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const size = 48
    canvas.width = size * 2
    canvas.height = Math.ceil(tileCount / 2) * size
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < tileCount; i++) {
        const col = i % 2
        const row = Math.floor(i / 2)
        const srcCol = i % tileset.columns
        const srcRow = Math.floor(i / tileset.columns)

        ctx.drawImage(
          img,
          srcCol * tileset.tileWidth,
          srcRow * tileset.tileHeight,
          tileset.tileWidth,
          tileset.tileHeight,
          col * size, row * size, size, size,
        )

        if (state.selectedTileIndex === i + 1) {
          ctx.strokeStyle = '#6c5ce7'
          ctx.lineWidth = 3
          ctx.strokeRect(col * size + 1, row * size + 1, size - 2, size - 2)
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.1)'
          ctx.lineWidth = 1
          ctx.strokeRect(col * size, row * size, size, size)
        }
      }
    }
    if (tileset.imageDataUrl) {
      img.src = tileset.imageDataUrl
    }
  }, [tileset, state.selectedTileIndex, tileCount])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const size = 48
    const col = Math.floor((e.clientX - rect.left) / size)
    const row = Math.floor((e.clientY - rect.top) / size)
    const index = row * 2 + col + 1
    if (index >= 1 && index <= tileCount) {
      dispatch({ type: 'SET_TILE_INDEX', index })
    }
  }

  function handleDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const size = 48
    const col = Math.floor((e.clientX - rect.left) / size)
    const row = Math.floor((e.clientY - rect.top) / size)
    const index = row * 2 + col + 1
    if (index >= 1 && index <= tileCount) {
      setEditingTile(index)
    }
  }

  function handleTileSave(dataUrl: string) {
    if (editingTile === null) return

    // We need to composite the edited tile back into the tileset image
    const img = new Image()
    img.onload = () => {
      const tileImg = new Image()
      tileImg.onload = () => {
        const offscreen = document.createElement('canvas')
        offscreen.width = img.width
        offscreen.height = img.height
        const ctx = offscreen.getContext('2d')!

        // Draw existing tileset
        ctx.drawImage(img, 0, 0)

        // Overwrite the edited tile
        const srcCol = (editingTile - 1) % tileset.columns
        const srcRow = Math.floor((editingTile - 1) / tileset.columns)
        ctx.clearRect(srcCol * tileset.tileWidth, srcRow * tileset.tileHeight, tileset.tileWidth, tileset.tileHeight)
        ctx.drawImage(tileImg, srcCol * tileset.tileWidth, srcRow * tileset.tileHeight, tileset.tileWidth, tileset.tileHeight)

        dispatch({
          type: 'UPDATE_TILESET',
          tileset: { ...tileset, imageDataUrl: offscreen.toDataURL() },
        })
        setEditingTile(null)
      }
      tileImg.src = dataUrl
    }
    if (tileset.imageDataUrl) {
      img.src = tileset.imageDataUrl
    }
  }

  function addTile() {
    // Expand the tileset by one column
    const newColumns = tileset.columns + 1
    const img = new Image()
    img.onload = () => {
      const offscreen = document.createElement('canvas')
      offscreen.width = newColumns * tileset.tileWidth
      offscreen.height = tileset.tileHeight
      const ctx = offscreen.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      // New tile slot is empty (transparent)
      dispatch({
        type: 'UPDATE_TILESET',
        tileset: {
          ...tileset,
          columns: newColumns,
          imageDataUrl: offscreen.toDataURL(),
          tileProperties: {
            ...tileset.tileProperties,
            [newColumns]: { solid: false },
          },
        },
      })
      setEditingTile(newColumns)
    }
    if (tileset.imageDataUrl) {
      img.src = tileset.imageDataUrl
    } else {
      // No tileset image yet - create one
      const offscreen = document.createElement('canvas')
      const newCols = tileset.columns + 1
      offscreen.width = newCols * tileset.tileWidth
      offscreen.height = tileset.tileHeight
      dispatch({
        type: 'UPDATE_TILESET',
        tileset: {
          ...tileset,
          columns: newCols,
          imageDataUrl: offscreen.toDataURL(),
          tileProperties: {
            ...tileset.tileProperties,
            [newCols]: { solid: false },
          },
        },
      })
      setEditingTile(newCols)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          Tiles
        </h3>
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: '2px 6px', fontSize: 11 }}
          onClick={addTile}
          title="Add new tile"
        >
          +
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: 'pointer', imageRendering: 'pixelated', borderRadius: 4 }}
      />
      {/* Tile properties editor */}
      {(() => {
        const props = tileset.tileProperties[state.selectedTileIndex]
        const idx = state.selectedTileIndex
        return (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tile {idx}
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Label</label>
              <input
                className="input"
                style={{ width: '100%', padding: '2px 6px', fontSize: 11 }}
                value={props?.label ?? ''}
                placeholder="unnamed"
                onChange={e => dispatch({ type: 'UPDATE_TILE_PROPS', tileIndex: idx, props: { label: e.target.value } })}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={props?.solid ?? false}
                onChange={e => dispatch({ type: 'UPDATE_TILE_PROPS', tileIndex: idx, props: { solid: e.target.checked } })}
              />
              Solid
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={props?.damage ?? false}
                onChange={e => dispatch({ type: 'UPDATE_TILE_PROPS', tileIndex: idx, props: { damage: e.target.checked } })}
              />
              Damage
            </label>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              Double-click tile to draw
            </div>
          </div>
        )
      })()}

      {editingTile !== null && (
        <SpriteEditor
          width={ts}
          height={ts}
          onSave={handleTileSave}
          onCancel={() => setEditingTile(null)}
        />
      )}
    </div>
  )
}
