import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditor } from './EditorProvider'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export default function EditorCanvas() {
  const { state, dispatch, currentLevel } = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const isPainting = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const paintedTiles = useRef<Map<number, { oldValue: number; newValue: number }>>(new Map())
  const tilesetImage = useRef<HTMLImageElement | null>(null)
  const spriteImages = useRef<Map<string, HTMLImageElement>>(new Map())
  const [spriteLoadCount, setSpriteLoadCount] = useState(0)

  const ts = state.gameData.settings.tileSize
  const zoom = state.zoom

  // Load tileset image
  useEffect(() => {
    if (state.gameData.tileset.imageDataUrl) {
      const img = new Image()
      img.onload = () => { tilesetImage.current = img }
      img.src = state.gameData.tileset.imageDataUrl
    }
  }, [state.gameData.tileset.imageDataUrl])

  // Load object sprite images
  useEffect(() => {
    for (const def of state.gameData.objectDefs) {
      if (!def.spriteDataUrl) continue
      const existing = spriteImages.current.get(def.id)
      if (existing && existing.src === def.spriteDataUrl) continue
      const img = new Image()
      img.onload = () => {
        spriteImages.current.set(def.id, img)
        setSpriteLoadCount(c => c + 1)
      }
      img.src = def.spriteDataUrl
    }
  }, [state.gameData.objectDefs])

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const container = containerRef.current
    if (!container) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    ctx.fillStyle = state.gameData.settings.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(state.panX, state.panY)
    ctx.scale(zoom, zoom)

    const tileset = state.gameData.tileset
    const img = tilesetImage.current

    // Draw tile layers
    for (let li = 0; li < currentLevel.tileLayers.length; li++) {
      const layer = currentLevel.tileLayers[li]!
      if (!layer.visible) continue
      const isCurrentLayer = li === state.currentLayerIndex
      if (!isCurrentLayer) ctx.globalAlpha = 0.4

      for (let row = 0; row < currentLevel.height; row++) {
        for (let col = 0; col < currentLevel.width; col++) {
          const tileId = layer.data[row * currentLevel.width + col]
          if (!tileId || tileId === 0) continue

          const x = col * ts
          const y = row * ts

          if (img) {
            const srcCol = (tileId - 1) % tileset.columns
            const srcRow = Math.floor((tileId - 1) / tileset.columns)
            ctx.drawImage(
              img,
              srcCol * tileset.tileWidth, srcRow * tileset.tileHeight,
              tileset.tileWidth, tileset.tileHeight,
              x, y, ts, ts,
            )
          } else {
            const colors = ['#8B6914', '#666666', '#cc3333', '#2d5a1e']
            ctx.fillStyle = colors[(tileId - 1) % colors.length] ?? '#888'
            ctx.fillRect(x, y, ts, ts)
          }
        }
      }
      ctx.globalAlpha = 1
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 0.5
    for (let col = 0; col <= currentLevel.width; col++) {
      ctx.beginPath()
      ctx.moveTo(col * ts, 0)
      ctx.lineTo(col * ts, currentLevel.height * ts)
      ctx.stroke()
    }
    for (let row = 0; row <= currentLevel.height; row++) {
      ctx.beginPath()
      ctx.moveTo(0, row * ts)
      ctx.lineTo(currentLevel.width * ts, row * ts)
      ctx.stroke()
    }

    // Level boundary
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, currentLevel.width * ts, currentLevel.height * ts)

    // Objects
    for (const obj of currentLevel.objects) {
      const def = state.gameData.objectDefs.find(d => d.id === obj.defId)
      if (!def) continue
      const x = obj.x * ts
      const y = obj.y * ts
      const w = def.width * ts
      const h = def.height * ts

      const spriteImg = spriteImages.current.get(def.id)
      if (spriteImg) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(spriteImg, x, y, w, h)
        ctx.imageSmoothingEnabled = true
      } else {
        ctx.fillStyle = def.spriteColor
        ctx.fillRect(x, y, w, h)
        ctx.fillStyle = '#ffffff'
        ctx.font = `${Math.max(8, ts * 0.3)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(def.name, x + w / 2, y + h / 2 + ts * 0.1)
        ctx.textAlign = 'start'
      }

      // Selection highlight
      if (obj.id === state.selectedPlacedObjectId) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.strokeRect(x - 1, y - 1, w + 2, h + 2)
        ctx.setLineDash([])
      }
    }

    ctx.restore()
  }, [state, currentLevel, ts, zoom, spriteLoadCount])

  useEffect(() => {
    render()
  }, [render])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(render)
    observer.observe(container)
    return () => observer.disconnect()
  }, [render])

  function toWorld(clientX: number, clientY: number): { worldX: number; worldY: number; tileX: number; tileY: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const canvasX = clientX - rect.left
    const canvasY = clientY - rect.top
    const worldX = (canvasX - state.panX) / zoom
    const worldY = (canvasY - state.panY) / zoom
    const tileX = Math.floor(worldX / ts)
    const tileY = Math.floor(worldY / ts)
    return { worldX, worldY, tileX, tileY }
  }

  function paintTile(tileX: number, tileY: number) {
    if (tileX < 0 || tileX >= currentLevel.width || tileY < 0 || tileY >= currentLevel.height) return

    const idx = tileY * currentLevel.width + tileX
    const layer = currentLevel.tileLayers[state.currentLayerIndex]!
    const oldValue = layer.data[idx] ?? 0
    const newValue = state.currentTool === 'erase' ? 0 : state.selectedTileIndex

    if (oldValue === newValue) return
    if (paintedTiles.current.has(idx)) return

    paintedTiles.current.set(idx, { oldValue, newValue })

    // Immediate visual feedback via single-tile dispatch
    dispatch({
      type: 'PAINT_TILES',
      layerIndex: state.currentLayerIndex,
      tiles: [{ index: idx, oldValue, newValue }],
    })
  }

  function floodFill(startX: number, startY: number) {
    if (startX < 0 || startX >= currentLevel.width || startY < 0 || startY >= currentLevel.height) return

    const layer = currentLevel.tileLayers[state.currentLayerIndex]!
    const targetValue = layer.data[startY * currentLevel.width + startX] ?? 0
    const fillValue = state.selectedTileIndex

    if (targetValue === fillValue) return

    const tiles: { index: number; oldValue: number; newValue: number }[] = []
    const visited = new Set<number>()
    const stack = [[startX, startY]]

    while (stack.length > 0) {
      const [x, y] = stack.pop()!
      if (x! < 0 || x! >= currentLevel.width || y! < 0 || y! >= currentLevel.height) continue
      const idx = y! * currentLevel.width + x!
      if (visited.has(idx)) continue
      visited.add(idx)

      if ((layer.data[idx] ?? 0) !== targetValue) continue

      tiles.push({ index: idx, oldValue: targetValue, newValue: fillValue })
      stack.push([x! - 1, y!], [x! + 1, y!], [x!, y! - 1], [x!, y! + 1])
    }

    if (tiles.length > 0) {
      dispatch({ type: 'PAINT_TILES', layerIndex: state.currentLayerIndex, tiles })
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    const { tileX, tileY } = toWorld(e.clientX, e.clientY)

    // Middle click or right click = pan
    if (e.button === 1 || e.button === 2) {
      isPanning.current = true
      lastPan.current = { x: e.clientX, y: e.clientY }
      return
    }

    if (state.currentTool === 'paint' || state.currentTool === 'erase') {
      isPainting.current = true
      paintedTiles.current.clear()
      paintTile(tileX, tileY)
    } else if (state.currentTool === 'fill') {
      floodFill(tileX, tileY)
    } else if (state.currentTool === 'select') {
      const clickedObj = currentLevel.objects.find(obj => {
        const def = state.gameData.objectDefs.find(d => d.id === obj.defId)
        if (!def) return false
        return tileX >= obj.x && tileX < obj.x + def.width && tileY >= obj.y && tileY < obj.y + def.height
      })
      dispatch({ type: 'SELECT_PLACED_OBJECT', objectId: clickedObj?.id ?? null })
    } else if (state.currentTool === 'object' && state.selectedObjectDefId) {
      const def = state.gameData.objectDefs.find(d => d.id === state.selectedObjectDefId)
      if (!def) return
      if (tileX < 0 || tileX >= currentLevel.width || tileY < 0 || tileY >= currentLevel.height) return

      // Check for existing object at this position
      const existing = currentLevel.objects.find(o => o.x === tileX && o.y === tileY)
      if (existing) {
        dispatch({ type: 'REMOVE_OBJECT', objectId: existing.id })
      }

      dispatch({
        type: 'PLACE_OBJECT',
        object: {
          id: generateId(),
          defId: state.selectedObjectDefId,
          x: tileX,
          y: tileY,
          properties: {},
        },
      })
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isPanning.current) {
      const dx = e.clientX - lastPan.current.x
      const dy = e.clientY - lastPan.current.y
      lastPan.current = { x: e.clientX, y: e.clientY }
      dispatch({ type: 'SET_PAN', x: state.panX + dx, y: state.panY + dy })
      return
    }

    if (isPainting.current) {
      const { tileX, tileY } = toWorld(e.clientX, e.clientY)
      paintTile(tileX, tileY)
    }
  }

  function handleMouseUp() {
    isPanning.current = false
    isPainting.current = false
    paintedTiles.current.clear()
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    dispatch({ type: 'SET_ZOOM', zoom: zoom + delta })
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
  }

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', cursor: 'crosshair' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}
