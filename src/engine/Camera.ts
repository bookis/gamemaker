import type { Viewport } from '../types/engine'

export class Camera {
  x = 0
  y = 0
  viewportWidth: number
  viewportHeight: number
  worldWidth: number
  worldHeight: number
  private smoothing = 0.1

  constructor(viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number) {
    this.viewportWidth = viewportWidth
    this.viewportHeight = viewportHeight
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
  }

  follow(targetX: number, targetY: number) {
    const goalX = targetX - this.viewportWidth / 2
    const goalY = targetY - this.viewportHeight / 2

    this.x += (goalX - this.x) * this.smoothing
    this.y += (goalY - this.y) * this.smoothing

    this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.viewportWidth))
    this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.viewportHeight))
  }

  getViewport(): Viewport {
    return {
      x: Math.floor(this.x),
      y: Math.floor(this.y),
      width: this.viewportWidth,
      height: this.viewportHeight,
    }
  }

  apply(ctx: CanvasRenderingContext2D) {
    ctx.translate(-Math.floor(this.x), -Math.floor(this.y))
  }
}
