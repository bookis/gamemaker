import type { TilesetDef, TileLayer } from '../types/game'
import type { Entity } from '../types/engine'

export class CollisionSystem {
  private tileset: TilesetDef
  private layers: TileLayer[]
  private levelWidth: number
  private tileSize: number

  constructor(tileset: TilesetDef, layers: TileLayer[], levelWidth: number, tileSize: number) {
    this.tileset = tileset
    this.layers = layers
    this.levelWidth = levelWidth
    this.tileSize = tileSize
  }

  isSolid(tileX: number, tileY: number): boolean {
    for (const layer of this.layers) {
      if (!layer.visible) continue
      const idx = tileY * this.levelWidth + tileX
      const tileId = layer.data[idx]
      if (tileId && tileId > 0) {
        const props = this.tileset.tileProperties[tileId]
        if (props?.solid) return true
      }
    }
    return false
  }

  isDamage(tileX: number, tileY: number): boolean {
    for (const layer of this.layers) {
      if (!layer.visible) continue
      const idx = tileY * this.levelWidth + tileX
      const tileId = layer.data[idx]
      if (tileId && tileId > 0) {
        const props = this.tileset.tileProperties[tileId]
        if (props?.damage) return true
      }
    }
    return false
  }

  tileAt(x: number, y: number, layerIndex = 0): number {
    const layer = this.layers[layerIndex]
    if (!layer) return 0
    const idx = y * this.levelWidth + x
    return layer.data[idx] ?? 0
  }

  entityOverlap(a: Entity, b: Entity): boolean {
    const ts = this.tileSize
    return (
      a.x < b.x + b.width * ts &&
      a.x + a.width * ts > b.x &&
      a.y < b.y + b.height * ts &&
      a.y + a.height * ts > b.y
    )
  }

  resolveEntityTileCollisionX(entity: Entity): void {
    const ts = this.tileSize
    const left = Math.floor(entity.x / ts)
    const right = Math.floor((entity.x + entity.width * ts - 1) / ts)
    const top = Math.floor(entity.y / ts)
    const bottom = Math.floor((entity.y + entity.height * ts - 1) / ts)

    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (!this.isSolid(col, row)) continue

        const tileLeft = col * ts
        const tileRight = (col + 1) * ts

        if (entity.vx > 0) {
          entity.x = tileLeft - entity.width * ts
          entity.vx = 0
        } else if (entity.vx < 0) {
          entity.x = tileRight
          entity.vx = 0
        }
      }
    }
  }

  resolveEntityTileCollisionY(entity: Entity): void {
    const ts = this.tileSize
    const left = Math.floor(entity.x / ts)
    const right = Math.floor((entity.x + entity.width * ts - 1) / ts)
    const top = Math.floor(entity.y / ts)
    const bottom = Math.floor((entity.y + entity.height * ts - 1) / ts)

    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (!this.isSolid(col, row)) continue

        const tileTop = row * ts
        const tileBottom = (row + 1) * ts

        if (entity.vy > 0) {
          entity.y = tileTop - entity.height * ts
          entity.vy = 0
          entity.grounded = true
        } else if (entity.vy < 0) {
          entity.y = tileBottom
          entity.vy = 0
        }
      }
    }
  }

  checkEntityOnGround(entity: Entity): boolean {
    const ts = this.tileSize
    const row = Math.floor((entity.y + entity.height * ts + 1) / ts)
    const leftCol = Math.floor(entity.x / ts)
    const rightCol = Math.floor((entity.x + entity.width * ts - 1) / ts)

    for (let col = leftCol; col <= rightCol; col++) {
      if (this.isSolid(col, row)) return true
    }
    return false
  }

  checkEntityDamage(entity: Entity): boolean {
    const ts = this.tileSize
    const left = Math.floor(entity.x / ts)
    const right = Math.floor((entity.x + entity.width * ts - 1) / ts)
    const top = Math.floor(entity.y / ts)
    const bottom = Math.floor((entity.y + entity.height * ts - 1) / ts)

    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (this.isDamage(col, row)) return true
      }
    }
    return false
  }
}
