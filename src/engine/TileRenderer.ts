import type { TilesetDef, TileLayer } from '../types/game'
import type { Viewport } from '../types/engine'

export class TileRenderer {
  private tilesetImage: HTMLImageElement | null = null
  private ready = false
  private tileset: TilesetDef

  constructor(tileset: TilesetDef) {
    this.tileset = tileset
    if (tileset.imageDataUrl) {
      this.tilesetImage = new Image()
      this.tilesetImage.onload = () => { this.ready = true }
      this.tilesetImage.src = tileset.imageDataUrl
    }
  }

  draw(ctx: CanvasRenderingContext2D, layers: TileLayer[], levelWidth: number, tileSize: number, viewport: Viewport) {
    for (const layer of layers) {
      if (!layer.visible) continue
      this.drawLayer(ctx, layer, levelWidth, tileSize, viewport)
    }
  }

  private drawLayer(ctx: CanvasRenderingContext2D, layer: TileLayer, levelWidth: number, tileSize: number, viewport: Viewport) {
    const startCol = Math.max(0, Math.floor(viewport.x / tileSize))
    const startRow = Math.max(0, Math.floor(viewport.y / tileSize))
    const endCol = Math.min(levelWidth, Math.ceil((viewport.x + viewport.width) / tileSize) + 1)
    const endRow = Math.ceil((viewport.y + viewport.height) / tileSize) + 1

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const idx = row * levelWidth + col
        const tileId = layer.data[idx]
        if (!tileId || tileId === 0) continue

        const x = col * tileSize
        const y = row * tileSize

        if (this.ready && this.tilesetImage) {
          const srcCol = (tileId - 1) % this.tileset.columns
          const srcRow = Math.floor((tileId - 1) / this.tileset.columns)
          ctx.drawImage(
            this.tilesetImage,
            srcCol * this.tileset.tileWidth,
            srcRow * this.tileset.tileHeight,
            this.tileset.tileWidth,
            this.tileset.tileHeight,
            x, y, tileSize, tileSize,
          )
        } else {
          const colors = ['#8B6914', '#666666', '#cc3333', '#2d5a1e']
          ctx.fillStyle = colors[(tileId - 1) % colors.length] ?? '#888'
          ctx.fillRect(x, y, tileSize, tileSize)
        }
      }
    }
  }
}
