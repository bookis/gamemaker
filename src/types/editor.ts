export type EditorTool = 'paint' | 'erase' | 'fill' | 'select' | 'object'

export type EditorAction =
  | { type: 'paint'; layerIndex: number; tiles: { index: number; oldValue: number; newValue: number }[] }
  | { type: 'placeObject'; objectId: string }
  | { type: 'removeObject'; objectId: string; object: import('../types/game').PlacedObject }
  | { type: 'moveObject'; objectId: string; oldX: number; oldY: number; newX: number; newY: number }
