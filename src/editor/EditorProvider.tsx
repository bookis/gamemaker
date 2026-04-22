import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { GameDefinition, Level, PlacedObject, ObjectDef, TilesetDef } from '../types/game'
import type { EditorTool, EditorAction } from '../types/editor'

type EditorState = {
  gameData: GameDefinition
  currentTool: EditorTool
  selectedTileIndex: number
  selectedObjectDefId: string | null
  selectedPlacedObjectId: string | null
  currentLayerIndex: number
  currentLevelIndex: number
  zoom: number
  panX: number
  panY: number
  undoStack: EditorAction[]
  redoStack: EditorAction[]
  dirty: boolean
}

type Action =
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'SET_TILE_INDEX'; index: number }
  | { type: 'SET_OBJECT_DEF'; defId: string | null }
  | { type: 'SELECT_PLACED_OBJECT'; objectId: string | null }
  | { type: 'SET_LAYER'; index: number }
  | { type: 'SET_LEVEL'; index: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'PAINT_TILES'; layerIndex: number; tiles: { index: number; oldValue: number; newValue: number }[] }
  | { type: 'PLACE_OBJECT'; object: PlacedObject }
  | { type: 'REMOVE_OBJECT'; objectId: string }
  | { type: 'UPDATE_OBJECT_PROPS'; objectId: string; properties: Record<string, string | number | boolean> }
  | { type: 'MOVE_OBJECT'; objectId: string; x: number; y: number }
  | { type: 'ADD_LEVEL'; level: Level }
  | { type: 'REMOVE_LEVEL'; index: number }
  | { type: 'RENAME_LEVEL'; index: number; name: string }
  | { type: 'UPDATE_OBJECT_DEF'; defId: string; updates: Partial<ObjectDef> }
  | { type: 'ADD_OBJECT_DEF'; def: ObjectDef }
  | { type: 'REMOVE_OBJECT_DEF'; defId: string }
  | { type: 'UPDATE_TILESET'; tileset: TilesetDef }
  | { type: 'UPDATE_TILE_PROPS'; tileIndex: number; props: Partial<import('../types/game').TileProperties> }
  | { type: 'SET_GAME_DATA'; gameData: GameDefinition }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_CLEAN' }

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, currentTool: action.tool, selectedPlacedObjectId: null }
    case 'SET_TILE_INDEX':
      return { ...state, selectedTileIndex: action.index, currentTool: 'paint' }
    case 'SET_OBJECT_DEF':
      return { ...state, selectedObjectDefId: action.defId, currentTool: 'object' }
    case 'SELECT_PLACED_OBJECT':
      return { ...state, selectedPlacedObjectId: action.objectId }
    case 'SET_LAYER':
      return { ...state, currentLayerIndex: action.index }
    case 'SET_LEVEL':
      return { ...state, currentLevelIndex: action.index, selectedPlacedObjectId: null }
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.25, Math.min(4, action.zoom)) }
    case 'SET_PAN':
      return { ...state, panX: action.x, panY: action.y }
    case 'PAINT_TILES': {
      const gameData = structuredClone(state.gameData)
      const level = gameData.levels[state.currentLevelIndex]!
      const layer = level.tileLayers[action.layerIndex]!
      for (const tile of action.tiles) {
        layer.data[tile.index] = tile.newValue
      }
      const undoAction: EditorAction = { type: 'paint', layerIndex: action.layerIndex, tiles: action.tiles }
      return {
        ...state,
        gameData,
        dirty: true,
        undoStack: [...state.undoStack, undoAction],
        redoStack: [],
      }
    }
    case 'PLACE_OBJECT': {
      const gameData = structuredClone(state.gameData)
      gameData.levels[state.currentLevelIndex]!.objects.push(action.object)
      const undoAction: EditorAction = { type: 'placeObject', objectId: action.object.id }
      return {
        ...state,
        gameData,
        dirty: true,
        undoStack: [...state.undoStack, undoAction],
        redoStack: [],
      }
    }
    case 'REMOVE_OBJECT': {
      const gameData = structuredClone(state.gameData)
      const level = gameData.levels[state.currentLevelIndex]!
      const objIndex = level.objects.findIndex(o => o.id === action.objectId)
      if (objIndex < 0) return state
      const removed = level.objects.splice(objIndex, 1)[0]!
      const undoAction: EditorAction = { type: 'removeObject', objectId: action.objectId, object: removed }
      return {
        ...state,
        gameData,
        dirty: true,
        selectedPlacedObjectId: state.selectedPlacedObjectId === action.objectId ? null : state.selectedPlacedObjectId,
        undoStack: [...state.undoStack, undoAction],
        redoStack: [],
      }
    }
    case 'UPDATE_OBJECT_PROPS': {
      const gameData = structuredClone(state.gameData)
      const obj = gameData.levels[state.currentLevelIndex]!.objects.find(o => o.id === action.objectId)
      if (!obj) return state
      obj.properties = { ...obj.properties, ...action.properties }
      return { ...state, gameData, dirty: true }
    }
    case 'MOVE_OBJECT': {
      const gameData = structuredClone(state.gameData)
      const obj = gameData.levels[state.currentLevelIndex]!.objects.find(o => o.id === action.objectId)
      if (!obj) return state
      const oldX = obj.x
      const oldY = obj.y
      obj.x = action.x
      obj.y = action.y
      const undoAction: EditorAction = { type: 'moveObject', objectId: action.objectId, oldX, oldY, newX: action.x, newY: action.y }
      return {
        ...state,
        gameData,
        dirty: true,
        undoStack: [...state.undoStack, undoAction],
        redoStack: [],
      }
    }
    case 'ADD_LEVEL': {
      const gameData = structuredClone(state.gameData)
      gameData.levels.push(action.level)
      return { ...state, gameData, dirty: true, currentLevelIndex: gameData.levels.length - 1 }
    }
    case 'REMOVE_LEVEL': {
      if (state.gameData.levels.length <= 1) return state
      const gameData = structuredClone(state.gameData)
      gameData.levels.splice(action.index, 1)
      const newIndex = Math.min(state.currentLevelIndex, gameData.levels.length - 1)
      return { ...state, gameData, dirty: true, currentLevelIndex: newIndex }
    }
    case 'RENAME_LEVEL': {
      const gameData = structuredClone(state.gameData)
      gameData.levels[action.index]!.name = action.name
      return { ...state, gameData, dirty: true }
    }
    case 'UPDATE_OBJECT_DEF': {
      const gameData = structuredClone(state.gameData)
      const defIndex = gameData.objectDefs.findIndex(d => d.id === action.defId)
      if (defIndex < 0) return state
      gameData.objectDefs[defIndex] = { ...gameData.objectDefs[defIndex]!, ...action.updates }
      return { ...state, gameData, dirty: true }
    }
    case 'ADD_OBJECT_DEF': {
      const gameData = structuredClone(state.gameData)
      gameData.objectDefs.push(action.def)
      return { ...state, gameData, dirty: true }
    }
    case 'REMOVE_OBJECT_DEF': {
      const gameData = structuredClone(state.gameData)
      gameData.objectDefs = gameData.objectDefs.filter(d => d.id !== action.defId)
      // Remove all placed instances of this object from all levels
      for (const level of gameData.levels) {
        level.objects = level.objects.filter(o => o.defId !== action.defId)
      }
      return {
        ...state,
        gameData,
        dirty: true,
        selectedObjectDefId: state.selectedObjectDefId === action.defId ? null : state.selectedObjectDefId,
      }
    }
    case 'UPDATE_TILESET': {
      const gameData = structuredClone(state.gameData)
      gameData.tileset = action.tileset
      return { ...state, gameData, dirty: true }
    }
    case 'UPDATE_TILE_PROPS': {
      const gameData = structuredClone(state.gameData)
      const existing = gameData.tileset.tileProperties[action.tileIndex] ?? { solid: false }
      gameData.tileset.tileProperties[action.tileIndex] = { ...existing, ...action.props }
      return { ...state, gameData, dirty: true }
    }
    case 'SET_GAME_DATA':
      return { ...state, gameData: action.gameData, dirty: false, undoStack: [], redoStack: [] }
    case 'UNDO': {
      if (state.undoStack.length === 0) return state
      const action2 = state.undoStack[state.undoStack.length - 1]!
      const gameData = structuredClone(state.gameData)
      const level = gameData.levels[state.currentLevelIndex]!

      if (action2.type === 'paint') {
        const layer = level.tileLayers[action2.layerIndex]!
        for (const tile of action2.tiles) {
          layer.data[tile.index] = tile.oldValue
        }
      } else if (action2.type === 'placeObject') {
        const idx = level.objects.findIndex(o => o.id === action2.objectId)
        if (idx >= 0) level.objects.splice(idx, 1)
      } else if (action2.type === 'removeObject') {
        level.objects.push(action2.object)
      } else if (action2.type === 'moveObject') {
        const obj = level.objects.find(o => o.id === action2.objectId)
        if (obj) { obj.x = action2.oldX; obj.y = action2.oldY }
      }

      return {
        ...state,
        gameData,
        dirty: true,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, action2],
      }
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state
      const action2 = state.redoStack[state.redoStack.length - 1]!
      const gameData = structuredClone(state.gameData)
      const level = gameData.levels[state.currentLevelIndex]!

      if (action2.type === 'paint') {
        const layer = level.tileLayers[action2.layerIndex]!
        for (const tile of action2.tiles) {
          layer.data[tile.index] = tile.newValue
        }
      } else if (action2.type === 'placeObject') {
        // Re-add would need the object data - simplify by not supporting
      } else if (action2.type === 'removeObject') {
        const idx = level.objects.findIndex(o => o.id === action2.objectId)
        if (idx >= 0) level.objects.splice(idx, 1)
      } else if (action2.type === 'moveObject') {
        const obj = level.objects.find(o => o.id === action2.objectId)
        if (obj) { obj.x = action2.newX; obj.y = action2.newY }
      }

      return {
        ...state,
        gameData,
        dirty: true,
        undoStack: [...state.undoStack, action2],
        redoStack: state.redoStack.slice(0, -1),
      }
    }
    case 'MARK_CLEAN':
      return { ...state, dirty: false }
    default:
      return state
  }
}

type EditorContextType = {
  state: EditorState
  dispatch: React.Dispatch<Action>
  currentLevel: Level
}

const EditorContext = createContext<EditorContextType | null>(null)

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}

export function EditorProvider({ gameData, children }: { gameData: GameDefinition; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    gameData,
    currentTool: 'paint',
    selectedTileIndex: 1,
    selectedObjectDefId: null,
    selectedPlacedObjectId: null,
    currentLayerIndex: 0,
    currentLevelIndex: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    undoStack: [],
    redoStack: [],
    dirty: false,
  })

  const currentLevel = state.gameData.levels[state.currentLevelIndex]!

  return (
    <EditorContext.Provider value={{ state, dispatch, currentLevel }}>
      {children}
    </EditorContext.Provider>
  )
}
