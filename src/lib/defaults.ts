import type { GameDefinition, GameType, ObjectDef } from '../types/game'

const PLATFORMER_OBJECTS: ObjectDef[] = [
  { id: 'player', name: 'Player', category: 'player', spriteColor: '#4488ff', width: 1, height: 1, defaultProperties: {} },
  { id: 'enemy-walker', name: 'Walker', category: 'enemy', spriteColor: '#ff4444', width: 1, height: 1, defaultProperties: { speed: 1, direction: 'left' } },
  { id: 'coin', name: 'Coin', category: 'collectible', spriteColor: '#ffdd00', width: 1, height: 1, defaultProperties: { scoreValue: 10 } },
  { id: 'exit-door', name: 'Exit Door', category: 'trigger', spriteColor: '#44ff44', width: 1, height: 2, defaultProperties: { targetLevel: '', targetX: 1, targetY: 1 } },
]

const TOPDOWN_OBJECTS: ObjectDef[] = [
  { id: 'player', name: 'Player', category: 'player', spriteColor: '#4488ff', width: 1, height: 1, defaultProperties: {} },
  { id: 'enemy-patrol', name: 'Patrol Enemy', category: 'enemy', spriteColor: '#ff4444', width: 1, height: 1, defaultProperties: { speed: 1, patrolAxis: 'horizontal', patrolRange: 3 } },
  { id: 'key', name: 'Key', category: 'collectible', spriteColor: '#ffdd00', width: 1, height: 1, defaultProperties: { keyId: 'default' } },
  { id: 'locked-door', name: 'Locked Door', category: 'trigger', spriteColor: '#886622', width: 1, height: 1, defaultProperties: { requiredKey: 'default', targetLevel: '', targetX: 1, targetY: 1 } },
  { id: 'heart', name: 'Heart', category: 'collectible', spriteColor: '#ff6688', width: 1, height: 1, defaultProperties: { healAmount: 1 } },
]

const PUZZLE_OBJECTS: ObjectDef[] = [
  { id: 'player', name: 'Player', category: 'player', spriteColor: '#4488ff', width: 1, height: 1, defaultProperties: {} },
  { id: 'box', name: 'Push Box', category: 'decoration', spriteColor: '#bb8844', width: 1, height: 1, defaultProperties: { pushable: true } },
  { id: 'goal', name: 'Goal Tile', category: 'trigger', spriteColor: '#44ff44', width: 1, height: 1, defaultProperties: {} },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function createEmptyLevel(width: number, height: number, name: string) {
  return {
    id: generateId(),
    name,
    width,
    height,
    tileLayers: [
      { name: 'background', data: new Array(width * height).fill(0), visible: true, zIndex: 0 },
      { name: 'foreground', data: new Array(width * height).fill(0), visible: true, zIndex: 1 },
    ],
    objects: [],
  }
}

export function createDefaultGameData(gameType: GameType): GameDefinition {
  const base = {
    version: 1 as const,
    gameType,
  }

  switch (gameType) {
    case 'platformer':
      return {
        ...base,
        settings: {
          tileSize: 32,
          viewportWidth: 20,
          viewportHeight: 15,
          backgroundColor: '#1a1a2e',
          gravity: 800,
          playerSpeed: 200,
          playerJumpForce: 400,
        },
        tileset: createDefaultTileset(),
        objectDefs: PLATFORMER_OBJECTS,
        levels: [createEmptyLevel(30, 15, 'Level 1')],
      }
    case 'topdown':
      return {
        ...base,
        settings: {
          tileSize: 32,
          viewportWidth: 20,
          viewportHeight: 15,
          backgroundColor: '#1a2e1a',
          playerSpeed: 160,
        },
        tileset: createDefaultTileset(),
        objectDefs: TOPDOWN_OBJECTS,
        levels: [createEmptyLevel(20, 15, 'Room 1')],
      }
    case 'puzzle':
      return {
        ...base,
        settings: {
          tileSize: 32,
          viewportWidth: 16,
          viewportHeight: 12,
          backgroundColor: '#2e2e1a',
          playerSpeed: 160,
        },
        tileset: createDefaultTileset(),
        objectDefs: PUZZLE_OBJECTS,
        levels: [createEmptyLevel(12, 10, 'Puzzle 1')],
      }
  }
}

function createDefaultTileset(): GameDefinition['tileset'] {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
  if (!canvas) {
    return {
      imageDataUrl: '',
      tileWidth: 32,
      tileHeight: 32,
      columns: 4,
      tileProperties: {
        1: { solid: false, label: 'ground-bg' },
        2: { solid: true, label: 'wall' },
        3: { solid: true, damage: true, label: 'spike' },
        4: { solid: false, label: 'decoration' },
      },
    }
  }

  canvas.width = 128
  canvas.height = 32
  const ctx = canvas.getContext('2d')!

  // Tile 1: Ground (brown)
  ctx.fillStyle = '#8B6914'
  ctx.fillRect(0, 0, 32, 32)
  ctx.fillStyle = '#7A5C12'
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(i * 5.3)
    const y = Math.floor((i * 7) % 28)
    ctx.fillRect(x, y, 4, 4)
  }

  // Tile 2: Wall (gray brick)
  ctx.fillStyle = '#666666'
  ctx.fillRect(32, 0, 32, 32)
  ctx.fillStyle = '#555555'
  ctx.fillRect(33, 1, 14, 6)
  ctx.fillRect(49, 1, 14, 6)
  ctx.fillRect(33, 9, 7, 6)
  ctx.fillRect(42, 9, 14, 6)
  ctx.fillRect(58, 9, 5, 6)
  ctx.fillRect(33, 17, 14, 6)
  ctx.fillRect(49, 17, 14, 6)
  ctx.fillRect(33, 25, 7, 6)
  ctx.fillRect(42, 25, 14, 6)
  ctx.fillRect(58, 25, 5, 6)

  // Tile 3: Spike (red)
  ctx.fillStyle = '#cc3333'
  ctx.fillRect(64, 0, 32, 32)
  ctx.fillStyle = '#ff4444'
  ctx.beginPath()
  ctx.moveTo(72, 28)
  ctx.lineTo(80, 4)
  ctx.lineTo(88, 28)
  ctx.fill()

  // Tile 4: Decoration (grass/flower)
  ctx.fillStyle = '#2d5a1e'
  ctx.fillRect(96, 0, 32, 32)
  ctx.fillStyle = '#3d7a2e'
  ctx.fillRect(100, 8, 3, 20)
  ctx.fillRect(110, 12, 3, 16)
  ctx.fillRect(120, 6, 3, 22)
  ctx.fillStyle = '#ff88aa'
  ctx.fillRect(99, 4, 5, 5)
  ctx.fillStyle = '#ffff66'
  ctx.fillRect(109, 8, 5, 5)
  ctx.fillStyle = '#88aaff'
  ctx.fillRect(119, 2, 5, 5)

  return {
    imageDataUrl: canvas.toDataURL(),
    tileWidth: 32,
    tileHeight: 32,
    columns: 4,
    tileProperties: {
      1: { solid: false, label: 'ground' },
      2: { solid: true, label: 'wall' },
      3: { solid: true, damage: true, label: 'spike' },
      4: { solid: false, label: 'decoration' },
    },
  }
}
