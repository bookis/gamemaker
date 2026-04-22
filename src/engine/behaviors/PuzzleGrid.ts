import type { GameBehavior, EngineContext } from '../../types/engine'

export class PuzzleGrid implements GameBehavior {
  private moveDelay = 0.15
  private moveTimer = 0
  private goalCount = 0

  init(engine: EngineContext) {
    this.moveTimer = 0
    // Count goals for win condition
    this.goalCount = engine.entities.filter(e => e.defId === 'goal').length

    // Snap all entities to grid
    for (const entity of engine.entities) {
      entity.x = entity.gridX * engine.tileSize
      entity.y = entity.gridY * engine.tileSize
    }
  }

  update(engine: EngineContext, dt: number) {
    const player = engine.player
    if (!player) return

    this.moveTimer -= dt
    if (this.moveTimer > 0) return

    let dx = 0
    let dy = 0
    if (engine.input.left) dx = -1
    else if (engine.input.right) dx = 1
    else if (engine.input.up) dy = -1
    else if (engine.input.down) dy = 1

    if (dx === 0 && dy === 0) return

    const ts = engine.tileSize
    const targetGridX = player.gridX + dx
    const targetGridY = player.gridY + dy

    // Check wall
    if (engine.isSolid(targetGridX, targetGridY)) return

    // Check pushable box
    const box = engine.entities.find(
      e => e.active && e.properties['pushable'] && e.gridX === targetGridX && e.gridY === targetGridY
    )

    if (box) {
      const boxTargetX = box.gridX + dx
      const boxTargetY = box.gridY + dy

      // Can't push into wall
      if (engine.isSolid(boxTargetX, boxTargetY)) return

      // Can't push into another box
      const blocked = engine.entities.find(
        e => e.active && e.properties['pushable'] && e.gridX === boxTargetX && e.gridY === boxTargetY
      )
      if (blocked) return

      // Push the box
      box.gridX = boxTargetX
      box.gridY = boxTargetY
      box.x = boxTargetX * ts
      box.y = boxTargetY * ts
    }

    // Check non-pushable entity blocking
    const blocker = engine.entities.find(
      e => e.active && e.category === 'decoration' && !e.properties['pushable'] && e.gridX === targetGridX && e.gridY === targetGridY
    )
    if (blocker) return

    // Move player
    player.gridX = targetGridX
    player.gridY = targetGridY
    player.x = targetGridX * ts
    player.y = targetGridY * ts
    if (dx > 0) player.facingRight = true
    if (dx < 0) player.facingRight = false

    this.moveTimer = this.moveDelay

    // Check collectibles
    for (const entity of engine.entities) {
      if (!entity.active || entity.category !== 'collectible') continue
      if (entity.gridX === player.gridX && entity.gridY === player.gridY) {
        engine.removeEntity(entity.id)
        engine.addScore(entity.properties['scoreValue'] as number ?? 10)
      }
    }

    // Check triggers
    for (const entity of engine.entities) {
      if (!entity.active || entity.category !== 'trigger' || entity.defId === 'goal') continue
      if (entity.gridX === player.gridX && entity.gridY === player.gridY) {
        const targetLevel = entity.properties['targetLevel'] as string
        if (targetLevel) {
          engine.loadLevel(targetLevel)
          return
        }
      }
    }

    // Check win: all goals have boxes on them
    if (this.goalCount > 0) {
      const goals = engine.entities.filter(e => e.active && e.defId === 'goal')
      const allCovered = goals.every(goal =>
        engine.entities.some(e => e.active && e.properties['pushable'] && e.gridX === goal.gridX && e.gridY === goal.gridY)
      )
      if (allCovered) {
        engine.setState('won')
      }
    }
  }
}
