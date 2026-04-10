import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Player } from '../types';

interface Props {
  player: Player;
  position: { x: number; y: number };
  onClose: () => void;
  onTip?: (player: Player) => void;
  onMute?: (player: Player) => void;
}

const VIP_COLORS: Record<string, string> = {
  DIAMOND: '#B9F2FF',
  PLATINUM: '#E5E4E2',
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  BRONZE: '#CD7F32',
};

function getLevelBadgeColor(level: number): string {
  if (level >= 51) return '#EAB308';
  if (level >= 31) return '#8B5CF6';
  if (level >= 11) return '#3B82F6';
  return '#6B7280';
}

export function PlayerCard({ player, position, onClose, onTip, onMute }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const avatarColor = player.avatarColor || '#6B7280';
  const vipColor = player.vipStatus ? VIP_COLORS[player.vipStatus] : undefined;
  const levelColor = getLevelBadgeColor(player.level || 0);

  // Clamp position so card stays in viewport
  const left = Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 270);
  const top = Math.min(position.y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 320);

  return (
    <div
      ref={cardRef}
      class="cc-player-card"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      <div class="cc-player-card__inner">
        {/* Header */}
        <div class="cc-player-card__header">
          <div class="cc-player-card__avatar-section">
            <div class="cc-player-card__avatar-wrap">
              {player.avatarUrl ? (
                <img
                  src={player.avatarUrl}
                  alt={player.username}
                  class="cc-player-card__avatar-img"
                />
              ) : (
                <div
                  class="cc-player-card__avatar-placeholder"
                  style={{
                    backgroundColor: avatarColor + '20',
                    color: avatarColor,
                    borderColor: avatarColor,
                  }}
                >
                  {(player.username || '?')[0].toUpperCase()}
                </div>
              )}
              {player.level != null && (
                <div
                  class="cc-player-card__level-badge"
                  style={{ backgroundColor: levelColor }}
                >
                  {player.level}
                </div>
              )}
            </div>
            <div class="cc-player-card__name-section">
              <div class="cc-player-card__username" style={vipColor ? { color: vipColor } : undefined}>
                {player.isModerator && <span class="cc-badge cc-badge--mod">MOD</span>}
                {player.isStreamer && <span class="cc-badge cc-badge--streamer">LIVE</span>}
                {player.username || 'Anonymous'}
              </div>
              {player.level != null && (
                <div class="cc-player-card__level-text">Level {player.level}</div>
              )}
              {player.vipStatus && player.vipStatus !== 'NONE' && (
                <div class="cc-player-card__vip" style={vipColor ? { color: vipColor } : undefined}>
                  {player.vipStatus} VIP
                </div>
              )}
            </div>
          </div>
          <button class="cc-player-card__close" onClick={onClose}>
            &#10005;
          </button>
        </div>

        {/* Stats */}
        <div class="cc-player-card__stats">
          {player.memberSince && (
            <div class="cc-player-card__stat">
              <span class="cc-player-card__stat-label">Member since</span>
              <span class="cc-player-card__stat-value">{player.memberSince}</span>
            </div>
          )}
          {player.totalWagered != null && (
            <div class="cc-player-card__stat">
              <span class="cc-player-card__stat-label">Total wagered</span>
              <span class="cc-player-card__stat-value">{player.totalWagered.toLocaleString()}</span>
            </div>
          )}
          {player.favoriteGame && (
            <div class="cc-player-card__stat">
              <span class="cc-player-card__stat-label">Favorite game</span>
              <span class="cc-player-card__stat-value">{player.favoriteGame}</span>
            </div>
          )}
          {player.winCount != null && (
            <div class="cc-player-card__stat">
              <span class="cc-player-card__stat-label">Wins</span>
              <span class="cc-player-card__stat-value">{player.winCount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div class="cc-player-card__actions">
          {onTip && (
            <button
              class="cc-player-card__action cc-player-card__action--tip"
              onClick={() => {
                onTip(player);
                onClose();
              }}
            >
              &#128176; Tip
            </button>
          )}
          <button
            class="cc-player-card__action cc-player-card__action--mute"
            onClick={() => {
              if (onMute) onMute(player);
              onClose();
            }}
          >
            &#128263; Mute
          </button>
        </div>
      </div>
    </div>
  );
}
