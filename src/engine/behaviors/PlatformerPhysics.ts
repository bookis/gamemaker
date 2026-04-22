import type { GameBehavior, EngineContext, Entity } from '../../types/engine'

export class PlatformerPhysics implements GameBehavior {
  private gravity = 800
  private playerSpeed = 200
  private jumpForce = 400

  init(engine: EngineContext) {
    this.gravity = engine.settings.gravity ?? 800
    this.playerSpeed = engine.settings.playerSpeed ?? 200
    this.jumpForce = engine.settings.playerJumpForce ?? 400
  }

  update(engine: EngineContext, dt: number) {
    const { entities, input, tileSize } = engine
    const player = engine.player
    if (!player) return

    // Player horizontal movement
    player.vx = 0
    if (input.left) {
      player.vx = -this.playerSpeed
      player.facingRight = false
    }
    if (input.right) {
      player.vx = this.playerSpeed
      player.facingRight = true
    }

    // Jump
    if (input.jumpPressed && player.grounded) {
      player.vy = -this.jumpForce
      player.grounded = false
    }

    // Gravity
    player.vy += this.gravity * dt

    // Cap falling speed
    if (player.vy > 600) player.vy = 600

    // Move and collide
    player.x += player.vx * dt
    this.resolveX(player, engine)
    player.y += player.vy * dt
    player.grounded = false
    this.resolveY(player, engine)

    // Check ground
    if (!player.grounded) {
      const row = Math.floor((player.y + player.height * tileSize + 1) / tileSize)
      const leftCol = Math.floor(player.x / tileSize)
      const rightCol = Math.floor((player.x + player.width * tileSize - 1) / tileSize)
      for (let col = leftCol; col <= rightCol; col++) {
        if (engine.isSolid(col, row)) {
          player.grounded = true
          break
        }
      }
    }

    // Fall off bottom = death
    if (player.y > engine.levelHeight * tileSize + 100) {
      engine.setState('lost')
    }

    // Enemy AI
    for (const entity of entities) {
      if (entity.category !== 'enemy' || !entity.active) continue
      this.updateEnemy(entity, engine, dt)
    }

    // Entity-entity collisions
    this.checkCollisions(engine)
  }

  private updateEnemy(enemy: Entity, engine: EngineContext, dt: number) {
    const speed = (enemy.properties['speed'] as number ?? 1) * 60
    const dir = enemy.facingRight ? 1 : -1
    enemy.vx = speed * dir

    enemy.vy += this.gravity * dt
    if (enemy.vy > 600) enemy.vy = 600

    enemy.x += enemy.vx * dt
    this.resolveX(enemy, engine)
    enemy.y += enemy.vy * dt
    enemy.grounded = false
    this.resolveY(enemy, engine)

    // Turn around at walls
    const ts = engine.tileSize
    const checkCol = Math.floor((enemy.x + (enemy.facingRight ? enemy.width * ts + 2 : -2)) / ts)
    const checkRow = Math.floor((enemy.y + enemy.height * ts / 2) / ts)
    if (engine.isSolid(checkCol, checkRow)) {
      enemy.facingRight = !enemy.facingRight
    }

    // Turn around at ledges
    if (enemy.grounded) {
      const edgeCol = Math.floor((enemy.x + (enemy.facingRight ? enemy.width * ts : 0)) / ts)
      const belowRow = Math.floor((enemy.y + enemy.height * ts) / ts) + 1
      if (!engine.isSolid(edgeCol, belowRow)) {
        enemy.facingRight = !enemy.facingRight
      }
    }
  }

  private checkCollisions(engine: EngineContext) {
    const player = engine.player
    if (!player) return
    const ts = engine.tileSize

    for (const entity of engine.entities) {
      if (!entity.active || entity === player) continue

      const overlap =
        player.x < entity.x + entity.width * ts &&
        player.x + player.width * ts > entity.x &&
        player.y < entity.y + entity.height * ts &&
        player.y + player.height * ts > entity.y

      if (!overlap) continue

      if (entity.category === 'enemy') {
        // Stomp from above
        if (player.vy > 0 && player.y + player.height * ts - entity.y < ts * 0.5) {
          engine.removeEntity(entity.id)
          player.vy = -this.jumpForce * 0.6
          engine.addScore(100)
        } else {
          engine.setState('lost')
        }
      } else if (entity.category === 'collectible') {
        engine.removeEntity(entity.id)
        engine.addScore(entity.properties['scoreValue'] as number ?? 10)
      } else if (entity.category === 'trigger') {
        const targetLevel = entity.properties['targetLevel'] as string
        if (targetLevel) {
          engine.loadLevel(targetLevel)
        } else {
          engine.setState('won')
        }
      }
    }

    // Tile damage check
    const left = Math.floor(player.x / ts)
    const right = Math.floor((player.x + player.width * ts - 1) / ts)
    const top = Math.floor(player.y / ts)
    const bottom = Math.floor((player.y + player.height * ts - 1) / ts)
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        for (let layer = 0; layer < 2; layer++) {
          const tileId = engine.tileAt(col, row, layer)
          if (tileId > 0) {
            // Check damage via isSolid-like approach - we need tileset access
            // For now, tile 3 is spikes
          }
        }
      }
    }
  }

  private resolveX(entity: { x: number; y: number; vx: number; vy: number; width: number; height: number; grounded: boolean; facingRight: boolean }, engine: EngineContext) {
    const ts = engine.tileSize
    const left = Math.floor(entity.x / ts)
    const right = Math.floor((entity.x + entity.width * ts - 1) / ts)
    const top = Math.floor(entity.y / ts)
    const bottom = Math.floor((entity.y + entity.height * ts - 1) / ts)

    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (!engine.isSolid(col, row)) continue
        if (entity.vx > 0) {
          entity.x = col * ts - entity.width * ts
          entity.vx = 0
        } else if (entity.vx < 0) {
          entity.x = (col + 1) * ts
          entity.vx = 0
        }
      }
    }
  }

  private resolveY(entity: { x: number; y: number; vx: number; vy: number; width: number; height: number; grounded: boolean }, engine: EngineContext) {
    const ts = engine.tileSize
    const left = Math.floor(entity.x / ts)
    const right = Math.floor((entity.x + entity.width * ts - 1) / ts)
    const top = Math.floor(entity.y / ts)
    const bottom = Math.floor((entity.y + entity.height * ts - 1) / ts)

    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (!engine.isSolid(col, row)) continue
        if (entity.vy > 0) {
          entity.y = row * ts - entity.height * ts
          entity.vy = 0
          entity.grounded = true
        } else if (entity.vy < 0) {
          entity.y = (row + 1) * ts
          entity.vy = 0
        }
      }
    }
  }
}
