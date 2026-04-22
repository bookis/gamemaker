import { useRef, useEffect, useCallback } from 'react'
import type { GameDefinition } from '../types/game'
import type { GameState } from '../types/engine'
import { GameEngine } from '../engine/GameEngine'

type Props = {
  gameData: GameDefinition
  onStateChange?: (state: GameState, score: number) => void
  onExit?: () => void
}

export default function PlayCanvas({ gameData, onStateChange, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && onExit) {
      onExit()
    }
    if (e.key === 'r' || e.key === 'R') {
      engineRef.current?.restart()
    }
  }, [onExit])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ts = gameData.settings.tileSize
    canvas.width = gameData.settings.viewportWidth * ts
    canvas.height = gameData.settings.viewportHeight * ts

    const engine = new GameEngine(canvas, gameData, onStateChange)
    engineRef.current = engine
    engine.start()

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      engine.stop()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gameData, onStateChange, handleKeyDown])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        border: '2px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}
    />
  )
}
