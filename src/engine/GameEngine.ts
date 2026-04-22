import type { GameDefinition, Level } from '../types/game'
import type { GameState, GameBehavior, EngineContext } from '../types/engine'
import { InputManager } from './InputManager'
import { Camera } from './Camera'
import { TileRenderer } from './TileRenderer'
import { EntityManager } from './EntityManager'
import { PlatformerPhysics } from './behaviors/PlatformerPhysics'
import { TopDownMovement } from './behaviors/TopDownMovement'
import { PuzzleGrid } from './behaviors/PuzzleGrid'

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private gameData: GameDefinition
  private input: InputManager
  private camera: Camera
  private tileRenderer: TileRenderer
  private entityManager: EntityManager
  private behavior: GameBehavior
  private currentLevel: Level
  private currentLevelIndex = 0
  private animationId = 0
  private lastTime = 0
  private state: GameState = 'playing'
  private score = 0
  private onStateChange?: (state: GameState, score: number) => void
  private spriteImages = new Map<string, HTMLImageElement>()

  constructor(canvas: HTMLCanvasElement, gameData: GameDefinition, onStateChange?: (state: GameState, score: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.gameData = gameData
    this.onStateChange = onStateChange

    this.input = new InputManager()
    this.tileRenderer = new TileRenderer(gameData.tileset)
    this.entityManager = new EntityManager()

    const level = gameData.levels[0]!
    this.currentLevel = level
    const ts = gameData.settings.tileSize

    this.camera = new Camera(
      canvas.width,
      canvas.height,
      level.width * ts,
      level.height * ts,
    )

    switch (gameData.gameType) {
      case 'platformer':
        this.behavior = new PlatformerPhysics()
        break
      case 'topdown':
        this.behavior = new TopDownMovement()
        break
      case 'puzzle':
        this.behavior = new PuzzleGrid()
        break
    }

    // Preload object sprite images
    for (const def of gameData.objectDefs) {
      if (def.spriteDataUrl) {
        const img = new Image()
        img.src = def.spriteDataUrl
        this.spriteImages.set(def.id, img)
      }
    }

    this.loadLevelByIndex(0)
  }

  private loadLevelByIndex(index: number) {
    const level = this.gameData.levels[index]
    if (!level) return
    this.currentLevel = level
    this.currentLevelIndex = index
    const ts = this.gameData.settings.tileSize

    this.camera = new Camera(
      this.canvas.width,
      this.canvas.height,
      level.width * ts,
      level.height * ts,
    )

    this.entityManager.spawnFromLevel(level.objects, this.gameData.objectDefs, ts)

    const context = this.createContext()
    this.behavior.init(context)
  }

  private createContext(): EngineContext {
    const level = this.currentLevel
    const ts = this.gameData.settings.tileSize
    const tileset = this.gameData.tileset

    return {
      entities: this.entityManager.getActive(),
      player: this.entityManager.getPlayer(),
      input: this.input.state,
      tileSize: ts,
      levelWidth: level.width,
      levelHeight: level.height,
      tileAt: (x: number, y: number, layerIdx = 0) => {
        const layer = level.tileLayers[layerIdx]
        if (!layer) return 0
        if (x < 0 || x >= level.width || y < 0 || y >= level.height) return 0
        return layer.data[y * level.width + x] ?? 0
      },
      isSolid: (tileX: number, tileY: number) => {
        if (tileX < 0 || tileX >= level.width || tileY < 0 || tileY >= level.height) return true
        for (const layer of level.tileLayers) {
          if (!layer.visible) continue
          const tileId = layer.data[tileY * level.width + tileX]
          if (tileId && tileId > 0) {
            const props = tileset.tileProperties[tileId]
            if (props?.solid) return true
          }
        }
        return false
      },
      removeEntity: (id: string) => this.entityManager.remove(id),
      setState: (newState: GameState) => {
        this.state = newState
        this.onStateChange?.(newState, this.score)
      },
      addScore: (amount: number) => {
        this.score += amount
      },
      loadLevel: (levelId: string) => {
        const idx = this.gameData.levels.findIndex(l => l.id === levelId)
        if (idx >= 0) {
          this.loadLevelByIndex(idx)
        } else {
          // Try next level
          const next = this.currentLevelIndex + 1
          if (next < this.gameData.levels.length) {
            this.loadLevelByIndex(next)
          } else {
            this.state = 'won'
            this.onStateChange?.('won', this.score)
          }
        }
      },
      settings: this.gameData.settings,
    }
  }

  start() {
    this.input.attach(this.canvas)
    this.state = 'playing'
    this.score = 0
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  stop() {
    cancelAnimationFrame(this.animationId)
    this.input.detach(this.canvas)
  }

  restart() {
    this.state = 'playing'
    this.score = 0
    this.loadLevelByIndex(0)
    this.onStateChange?.('playing', 0)
  }

  private loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05)
    this.lastTime = time

    if (this.state === 'playing') {
      this.input.poll()
      const context = this.createContext()
      this.behavior.update(context, dt)

      const player = this.entityManager.getPlayer()
      if (player) {
        this.camera.follow(
          player.x + (player.width * this.gameData.settings.tileSize) / 2,
          player.y + (player.height * this.gameData.settings.tileSize) / 2,
        )
      }
    }

    this.render()
    this.animationId = requestAnimationFrame(this.loop)
  }

  private render() {
    const ctx = this.ctx
    const ts = this.gameData.settings.tileSize
    const viewport = this.camera.getViewport()

    ctx.fillStyle = this.gameData.settings.backgroundColor
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    ctx.save()
    this.camera.apply(ctx)

    // Tiles
    this.tileRenderer.draw(ctx, this.currentLevel.tileLayers, this.currentLevel.width, ts, viewport)

    // Entities
    for (const entity of this.entityManager.getActive()) {
      const w = entity.width * ts
      const h = entity.height * ts
      const spriteImg = this.spriteImages.get(entity.defId)

      if (spriteImg && spriteImg.complete) {
        ctx.save()
        ctx.imageSmoothingEnabled = false
        if (!entity.facingRight && entity.category !== 'decoration' && entity.category !== 'trigger') {
          ctx.translate(entity.x + w, entity.y)
          ctx.scale(-1, 1)
          ctx.drawImage(spriteImg, 0, 0, w, h)
        } else {
          ctx.drawImage(spriteImg, entity.x, entity.y, w, h)
        }
        ctx.restore()
      } else {
        ctx.fillStyle = entity.color
        ctx.fillRect(entity.x, entity.y, w, h)

        if (entity.category === 'player') {
          ctx.fillStyle = '#ffffff'
          const eyeX = entity.facingRight ? entity.x + w * 0.6 : entity.x + w * 0.25
          ctx.fillRect(eyeX, entity.y + h * 0.25, w * 0.15, h * 0.15)
          ctx.fillRect(entity.x + w * 0.3, entity.y + h * 0.6, w * 0.4, h * 0.1)
        } else if (entity.category === 'enemy') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(entity.x + w * 0.2, entity.y + h * 0.25, w * 0.2, h * 0.2)
          ctx.fillRect(entity.x + w * 0.6, entity.y + h * 0.25, w * 0.2, h * 0.2)
        } else if (entity.category === 'collectible') {
          ctx.fillStyle = '#ffffff44'
          ctx.beginPath()
          ctx.arc(entity.x + w / 2, entity.y + h / 2, w * 0.35, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    ctx.restore()

    // HUD
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px monospace'
    ctx.fillText(`Score: ${this.score}`, 12, 24)

    if (this.state === 'won') {
      this.drawOverlay(ctx, 'You Win!', '#2ecc71')
    } else if (this.state === 'lost') {
      this.drawOverlay(ctx, 'Game Over', '#e74c3c')
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, text: string, color: string) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.fillStyle = color
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2 - 20)
    ctx.font = '18px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 20)
    ctx.textAlign = 'start'
  }
}
