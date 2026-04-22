import { useRef, useState, useEffect, useCallback } from 'react'

type SpriteTool = 'pencil' | 'eraser' | 'fill' | 'line' | 'rect'

const DEFAULT_PALETTE = [
  '#000000', '#1d2b53', '#7e2553', '#008751',
  '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436',
  '#29adff', '#83769c', '#ff77a8', '#ffccaa',
  '#291814', '#111d35', '#422136', '#125359',
  '#742f29', '#49333b', '#a28879', '#f3ef7d',
  '#be1250', '#ff6c24', '#a8e72e', '#00b543',
  '#065ab5', '#754665', '#ff6e59', '#ff9768',
]

type Props = {
  width: number
  height: number
  initialPixels?: string[]
  onSave: (dataUrl: string, pixels: string[]) => void
  onCancel: () => void
}

export default function SpriteEditor({ width, height, initialPixels, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const [pixels, setPixels] = useState<string[]>(() => {
    if (initialPixels && initialPixels.length === width * height) return [...initialPixels]
    return new Array(width * height).fill('')
  })
  const [tool, setTool] = useState<SpriteTool>('pencil')
  const [color, setColor] = useState('#ff004d')
  const [isDrawing, setIsDrawing] = useState(false)
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null)
  const [previewPixels, setPreviewPixels] = useState<Map<number, string> | null>(null)
  const pixelSize = Math.min(Math.floor(400 / Math.max(width, height)), 24)
  const canvasWidth = width * pixelSize
  const canvasHeight = height * pixelSize

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    // Checkerboard background for transparency
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isLight = (x + y) % 2 === 0
        ctx.fillStyle = isLight ? '#2a2a40' : '#222238'
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
      }
    }

    // Pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const preview = previewPixels?.get(idx)
        const c = preview ?? pixels[idx]
        if (c) {
          ctx.fillStyle = c
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
        }
      }
    }

    // Grid
    if (pixelSize >= 6) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= width; x++) {
        ctx.beginPath()
        ctx.moveTo(x * pixelSize, 0)
        ctx.lineTo(x * pixelSize, canvasHeight)
        ctx.stroke()
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * pixelSize)
        ctx.lineTo(canvasWidth, y * pixelSize)
        ctx.stroke()
      }
    }

    // Preview canvas
    const preview = previewRef.current
    if (preview) {
      preview.width = width
      preview.height = height
      const pCtx = preview.getContext('2d')!
      pCtx.clearRect(0, 0, width, height)
      for (let y2 = 0; y2 < height; y2++) {
        for (let x2 = 0; x2 < width; x2++) {
          const c2 = pixels[y2 * width + x2]
          if (c2) {
            pCtx.fillStyle = c2
            pCtx.fillRect(x2, y2, 1, 1)
          }
        }
      }
    }
  }, [pixels, width, height, pixelSize, canvasWidth, canvasHeight, previewPixels])

  useEffect(() => { render() }, [render])

  function toGrid(e: React.MouseEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / (rect.width / width))
    const y = Math.floor((e.clientY - rect.top) / (rect.height / height))
    if (x < 0 || x >= width || y < 0 || y >= height) return null
    return { x, y }
  }

  function setPixel(x: number, y: number, c: string) {
    setPixels(prev => {
      const next = [...prev]
      next[y * width + x] = c
      return next
    })
  }

  function floodFillPixels(startX: number, startY: number, fillColor: string) {
    const target = pixels[startY * width + startX] ?? ''
    if (target === fillColor) return

    const next = [...pixels]
    const stack = [[startX, startY]]
    const visited = new Set<number>()

    while (stack.length > 0) {
      const [x, y] = stack.pop()!
      if (x! < 0 || x! >= width || y! < 0 || y! >= height) continue
      const idx = y! * width + x!
      if (visited.has(idx)) continue
      visited.add(idx)
      if ((next[idx] ?? '') !== target) continue
      next[idx] = fillColor
      stack.push([x! - 1, y!], [x! + 1, y!], [x!, y! - 1], [x!, y! + 1])
    }
    setPixels(next)
  }

  function getLinePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
    const result: [number, number][] = []
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    let cx = x0, cy = y0
    while (true) {
      result.push([cx, cy])
      if (cx === x1 && cy === y1) break
      const e2 = 2 * err
      if (e2 > -dy) { err -= dy; cx += sx }
      if (e2 < dx) { err += dx; cy += sy }
    }
    return result
  }

  function getRectPixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
    const result: [number, number][] = []
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1)
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1)
    for (let x = minX; x <= maxX; x++) {
      result.push([x, minY], [x, maxY])
    }
    for (let y = minY + 1; y < maxY; y++) {
      result.push([minX, y], [maxX, y])
    }
    return result
  }

  function handleMouseDown(e: React.MouseEvent) {
    const pos = toGrid(e)
    if (!pos) return
    setIsDrawing(true)

    const c = tool === 'eraser' ? '' : color

    if (tool === 'pencil' || tool === 'eraser') {
      setPixel(pos.x, pos.y, c)
    } else if (tool === 'fill') {
      floodFillPixels(pos.x, pos.y, c)
    } else if (tool === 'line' || tool === 'rect') {
      setLineStart(pos)
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const pos = toGrid(e)
    if (!pos) return

    if (!isDrawing) return
    const c = tool === 'eraser' ? '' : color

    if (tool === 'pencil' || tool === 'eraser') {
      setPixel(pos.x, pos.y, c)
    } else if ((tool === 'line' || tool === 'rect') && lineStart) {
      const pts = tool === 'line'
        ? getLinePixels(lineStart.x, lineStart.y, pos.x, pos.y)
        : getRectPixels(lineStart.x, lineStart.y, pos.x, pos.y)
      const preview = new Map<number, string>()
      for (const [px, py] of pts) {
        if (px >= 0 && px < width && py >= 0 && py < height) {
          preview.set(py * width + px, c)
        }
      }
      setPreviewPixels(preview)
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    const pos = toGrid(e)

    if ((tool === 'line' || tool === 'rect') && lineStart && pos) {
      const c = color
      const pts = tool === 'line'
        ? getLinePixels(lineStart.x, lineStart.y, pos.x, pos.y)
        : getRectPixels(lineStart.x, lineStart.y, pos.x, pos.y)
      setPixels(prev => {
        const next = [...prev]
        for (const [px, py] of pts) {
          if (px >= 0 && px < width && py >= 0 && py < height) {
            next[py * width + px] = c
          }
        }
        return next
      })
      setPreviewPixels(null)
    }

    setIsDrawing(false)
    setLineStart(null)
  }

  function handleSave() {
    const offscreen = document.createElement('canvas')
    offscreen.width = width
    offscreen.height = height
    const ctx = offscreen.getContext('2d')!
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = pixels[y * width + x]
        if (c) {
          ctx.fillStyle = c
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
    onSave(offscreen.toDataURL(), pixels)
  }

  function clearAll() {
    setPixels(new Array(width * height).fill(''))
  }

  const TOOLS: { id: SpriteTool; label: string }[] = [
    { id: 'pencil', label: 'Pencil' },
    { id: 'eraser', label: 'Eraser' },
    { id: 'fill', label: 'Fill' },
    { id: 'line', label: 'Line' },
    { id: 'rect', label: 'Rect' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', padding: 24, display: 'flex', gap: 20,
        maxWidth: '90vw', maxHeight: '90vh',
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: tools + palette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 140 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Sprite Editor</h3>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{width}x{height} px</div>

          {/* Tools */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Tools</div>
            {TOOLS.map(t => (
              <button
                key={t.id}
                className={`btn btn-sm ${tool === t.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTool(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Color picker */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Color</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 4, background: color, border: '2px solid var(--border)' }} />
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{ width: 28, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
              {DEFAULT_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: '100%', aspectRatio: '1', border: color === c ? '2px solid #fff' : '1px solid var(--border)',
                    borderRadius: 3, background: c, cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear</button>
          </div>
        </div>

        {/* Center: canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setIsDrawing(false); setLineStart(null); setPreviewPixels(null) }}
            style={{
              cursor: 'crosshair', imageRendering: 'pixelated',
              border: '1px solid var(--border)', borderRadius: 4,
              width: canvasWidth, height: canvasHeight,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Preview:</div>
            <canvas
              ref={previewRef}
              style={{
                imageRendering: 'pixelated', border: '1px solid var(--border)', borderRadius: 4,
                width: Math.max(width, height) * 3, height: Math.max(width, height) * 3,
              }}
            />
            <canvas
              ref={el => {
                if (!el) return
                el.width = width; el.height = height
                const ctx = el.getContext('2d')!
                ctx.clearRect(0, 0, width, height)
                for (let y = 0; y < height; y++) {
                  for (let x = 0; x < width; x++) {
                    const c2 = pixels[y * width + x]
                    if (c2) { ctx.fillStyle = c2; ctx.fillRect(x, y, 1, 1) }
                  }
                }
              }}
              style={{
                imageRendering: 'pixelated', border: '1px solid var(--border)', borderRadius: 4,
                width: Math.max(width, height) * 6, height: Math.max(width, height) * 6,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSave}>Save Sprite</button>
            <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
