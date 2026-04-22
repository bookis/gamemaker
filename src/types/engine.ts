export type Entity = {
  id: string
  defId: string
  x: number
  y: number
  width: number
  height: number
  vx: number
  vy: number
  color: string
  category: 'player' | 'enemy' | 'collectible' | 'trigger' | 'decoration'
  properties: Record<string, string | number | boolean>
  grounded: boolean
  facingRight: boolean
  active: boolean
  gridX: number
  gridY: number
}

export type GameState = 'playing' | 'paused' | 'won' | 'lost'

export interface GameBehavior {
  init(engine: EngineContext): void
  update(engine: EngineContext, dt: number): void
}

export type EngineContext = {
  entities: Entity[]
  player: Entity | null
  input: InputState
  tileAt: (x: number, y: number, layer?: number) => number
  isSolid: (tileX: number, tileY: number) => boolean
  tileSize: number
  levelWidth: number
  levelHeight: number
  removeEntity: (id: string) => void
  setState: (state: GameState) => void
  addScore: (amount: number) => void
  loadLevel: (levelId: string) => void
  settings: {
    gravity?: number
    playerSpeed: number
    playerJumpForce?: number
  }
}

export type InputState = {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  jump: boolean
  jumpPressed: boolean
  action: boolean
}

export type Viewport = {
  x: number
  y: number
  width: number
  height: number
}
