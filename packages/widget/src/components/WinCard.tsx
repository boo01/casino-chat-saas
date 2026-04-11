import { h } from 'preact';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
  isGuest?: boolean;
}

export function WinCard({ message, isGuest }: Props) {
  const { content } = message;
  const game = content?.game || 'Unknown Game';
  const gameColor = content?.accentColor || '#22C55E';
  const bet = content?.bet;
  const win = content?.win;
  const multiplier = content?.multiplier;
  const currency = content?.currency || '$';
  const resharedBy = content?.resharedBy;
  const reshareComment = content?.reshareComment;
  const playerName = message.username || 'Anonymous';

  return (
    <div class="cc-win-card">
      {/* Re-share header */}
      {resharedBy && (
        <div class="cc-win-card__reshare-header">
          <span class="cc-win-card__reshare-icon">{'\u21BA'}</span>
          <span class="cc-win-card__reshare-name">{resharedBy}</span>
          <span>shared {playerName}'s win:</span>
        </div>
      )}

      {/* Win card body */}
      <div
        class="cc-win-card__card"
        style={{
          borderLeftColor: gameColor,
          background: `linear-gradient(135deg, ${gameColor}15 0%, transparent 60%)`,
          backgroundColor: '#111827',
        }}
      >
        <div class="cc-win-card__content">
          {/* Game icon */}
          <div
            class="cc-win-card__icon"
            style={{ backgroundColor: gameColor }}
          >
            {game[0]}
          </div>

          {/* Win details */}
          <div class="cc-win-card__details">
            <div class="cc-win-card__header-row">
              <span class="cc-win-card__username">{playerName}</span>
              <span class="cc-win-card__won-label">won on</span>
              <span class="cc-win-card__game">{game}</span>
            </div>
            <div class="cc-win-card__amount-row">
              <span class="cc-win-card__amount">
                {win != null ? `${currency}${win.toLocaleString()}` : '---'}
              </span>
              {multiplier != null && (
                <span
                  class="cc-win-card__multiplier"
                  style={{ backgroundColor: gameColor }}
                >
                  x {multiplier}
                </span>
              )}
            </div>
            {bet != null && (
              <div class="cc-win-card__bet">
                Bet: {currency}{bet.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div class="cc-win-card__actions">
          <button class="cc-win-card__action cc-win-card__action--play">
            {'\u25B6'} Play This Game {'\u25B8'}
          </button>
          <button
            class="cc-win-card__action cc-win-card__action--share"
            disabled={isGuest}
            style={isGuest ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {'\u21BA'} Share
          </button>
        </div>
      </div>

      {/* Re-share comment */}
      {resharedBy && reshareComment && (
        <div class="cc-win-card__reshare-comment">{reshareComment}</div>
      )}
    </div>
  );
}
