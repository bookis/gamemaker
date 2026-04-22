import { useNavigate } from 'react-router-dom'
import type { GameRecord } from '../types/game'

const TYPE_LABELS = {
  platformer: 'Platformer',
  topdown: 'Top-Down',
  puzzle: 'Puzzle',
}

const TYPE_COLORS = {
  platformer: '#6c5ce7',
  topdown: '#00b894',
  puzzle: '#fdcb6e',
}

export default function GameCard({ game, onDelete }: { game: GameRecord; onDelete: (id: string) => void }) {
  const navigate = useNavigate()

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      <div
        onClick={() => navigate(`/edit/${game.id}`)}
        style={{
          height: 140,
          background: game.thumbnail_data_url
            ? `url(${game.thumbnail_data_url}) center/cover`
            : `linear-gradient(135deg, ${TYPE_COLORS[game.game_type]}22, ${TYPE_COLORS[game.game_type]}44)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {!game.thumbnail_data_url && (
          <span style={{ fontSize: 40, opacity: 0.5 }}>
            {game.game_type === 'platformer' ? '🎮' : game.game_type === 'topdown' ? '🗺️' : '🧩'}
          </span>
        )}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {game.name}
          </h3>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 99,
            background: `${TYPE_COLORS[game.game_type]}22`,
            color: TYPE_COLORS[game.game_type],
            fontWeight: 600,
          }}>
            {TYPE_LABELS[game.game_type]}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/edit/${game.id}`)}>
            Edit
          </button>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/play/${game.id}`)}>
            Play
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { if (confirm('Delete this game?')) onDelete(game.id) }}
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
