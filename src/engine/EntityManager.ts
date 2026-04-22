import type { Entity } from '../types/engine'
import type { PlacedObject, ObjectDef } from '../types/game'

export class EntityManager {
  entities: Entity[] = []

  spawnFromLevel(objects: PlacedObject[], objectDefs: ObjectDef[], tileSize: number) {
    this.entities = []
    for (const obj of objects) {
      const def = objectDefs.find(d => d.id === obj.defId)
      if (!def) continue

      this.entities.push({
        id: obj.id,
        defId: obj.defId,
        x: obj.x * tileSize,
        y: obj.y * tileSize,
        width: def.width,
        height: def.height,
        vx: 0,
        vy: 0,
        color: def.spriteColor,
        category: def.category,
        properties: { ...def.defaultProperties, ...obj.properties },
        grounded: false,
        facingRight: true,
        active: true,
        gridX: obj.x,
        gridY: obj.y,
      })
    }
  }

  getPlayer(): Entity | null {
    return this.entities.find(e => e.category === 'player' && e.active) ?? null
  }

  remove(id: string) {
    const entity = this.entities.find(e => e.id === id)
    if (entity) entity.active = false
  }

  getActive(): Entity[] {
    return this.entities.filter(e => e.active)
  }
}
