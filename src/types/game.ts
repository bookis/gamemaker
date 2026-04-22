export type GameType = 'platformer' | 'topdown' | 'puzzle'

export type GameDefinition = {
  version: 1
  gameType: GameType
  settings: GameSettings
  tileset: TilesetDef
  objectDefs: ObjectDef[]
  levels: Level[]
}

export type GameSettings = {
  tileSize: number
  viewportWidth: number
  viewportHeight: number
  backgroundColor: string
  gravity?: number
  playerSpeed: number
  playerJumpForce?: number
}

export type TilesetDef = {
  imageDataUrl: string
  tileWidth: number
  tileHeight: number
  columns: number
  tileProperties: Record<number, TileProperties>
}

export type TileProperties = {
  solid: boolean
  damage?: boolean
  slippery?: boolean
  pushable?: boolean
  label?: string
}

export type Level = {
  id: string
  name: string
  width: number
  height: number
  tileLayers: TileLayer[]
  objects: PlacedObject[]
}

export type TileLayer = {
  name: string
  data: number[]
  visible: boolean
  zIndex: number
}

export type PlacedObject = {
  id: string
  defId: string
  x: number
  y: number
  properties: Record<string, string | number | boolean>
}

export type ObjectCategory = 'player' | 'enemy' | 'collectible' | 'trigger' | 'decoration'

export type ObjectDef = {
  id: string
  name: string
  category: ObjectCategory
  spriteColor: string
  spriteDataUrl?: string
  width: number
  height: number
  defaultProperties: Record<string, string | number | boolean>
}

export type GameRecord = {
  id: string
  user_id: string
  name: string
  game_type: GameType
  game_data: GameDefinition
  thumbnail_data_url: string | null
  created_at: string
  updated_at: string
}
