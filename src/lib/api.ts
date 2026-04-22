import { apiFetch } from './popdb'
import type { GameRecord, GameDefinition, GameType } from '../types/game'
import { createDefaultGameData } from './defaults'

export async function getGames(): Promise<GameRecord[]> {
  return apiFetch<GameRecord[]>('/games?order=updated_at.desc')
}

export async function getGame(id: string): Promise<GameRecord> {
  const rows = await apiFetch<GameRecord[]>(`/games?id=eq.${id}`)
  if (rows.length === 0) throw new Error('Game not found')
  return rows[0]!
}

export async function createGame(userId: string, name: string, gameType: GameType): Promise<GameRecord> {
  const gameData = createDefaultGameData(gameType)
  const rows = await apiFetch<GameRecord[]>('/games', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      name,
      game_type: gameType,
      game_data: gameData,
    }),
  })
  return rows[0]!
}

export async function updateGame(id: string, updates: { name?: string; game_data?: GameDefinition; thumbnail_data_url?: string }): Promise<GameRecord> {
  const rows = await apiFetch<GameRecord[]>(`/games?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  })
  return rows[0]!
}

export async function deleteGame(id: string): Promise<void> {
  await apiFetch(`/games?id=eq.${id}`, { method: 'DELETE' })
}
