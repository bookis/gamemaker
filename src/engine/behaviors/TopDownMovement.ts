import type { GameBehavior, EngineContext, Entity } from '../../types/engine'

export class TopDownMovement implements GameBehavior {
  private playerSpeed = 160

  init(engine: EngineContext) {
    this.playerSpeed = engine.settings.playerSpeed ?? 160
  }

  update(engine: EngineContext, dt: number) {
    const player = engine.player
    if (!player) return

    player.vx = 0
    player.vy = 0

    if (engine.input.left) { player.vx = -this.playerSpeed; player.facingRight = false }
    if (engine.input.right) { player.vx = this.playerSpeed; player.facingRight = true }
    if (engine.input.up) player.vy = -this.playerSpeed
    if (engine.input.down) player.vy = this.playerSpeed

    // Normalize diagonal
    if (player.vx !== 0 && player.vy !== 0) {
      player.vx *= 0.707
      player.vy *= 0.707
    }

    player.x += player.vx * dt
    this.resolveX(player, engine)
    player.y += player.vy * dt
    this.resolveY(player, engine)

    // Enemy patrol
    for (const entity of engine.entities) {
      if (entity.category !== 'enemy' || !entity.active) continue
      this.updateEnemy(entity, engine, dt)
    }

    this.checkCollisions(engine)
  }

  private updateEnemy(enemy: Entity, engine: EngineContext, dt: number) {
    const speed = (enemy.properties['speed'] as number ?? 1) * 60
    const axis = enemy.properties['patrolAxis'] as string ?? 'horizontal'

    if (axis === 'horizontal') {
      enemy.vx = enemy.facingRight ? speed : -speed
      enemy.vy = 0
    } else {
      enemy.vx = 0
      enemy.vy = enemy.facingRight ? speed : -speed
    }

    const prevX = enemy.x
    const prevY = enemy.y

    enemy.x += enemy.vx * dt
    this.resolveX(enemy, engine)
    enemy.y += enemy.vy * dt
    this.resolveY(enemy, engine)

    if (Math.abs(enemy.x - prevX) < 0.1 && Math.abs(enemy.y - prevY) < 0.1) {
      enemy.facingRight = !enemy.facingRight
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
        engine.setState('lost')
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
  }

  private resolveX(entity: { x: number; y: number; vx: number; width: number; height: number }, engine: EngineContext) {
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

  private resolveY(entity: { x: number; y: number; vy: number; width: number; height: number }, engine: EngineContext) {
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
        } else if (entity.vy < 0) {
          entity.y = (row + 1) * ts
          entity.vy = 0
        }
      }
    }
  }
}
