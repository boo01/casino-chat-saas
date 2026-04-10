import { h } from 'preact';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
}

export function WinCard({ message }: Props) {
  const { content } = message;
  const game = content?.game || 'Unknown Game';
  const gameIcon = content?.gameIcon || game[0] || '?';
  const bet = content?.bet;
  const win = content?.win;
  const multiplier = content?.multiplier;
  const currency = content?.currency || 'USD';
  const resharedBy = content?.resharedBy;
  const reshareComment = content?.reshareComment;

  return (
    <div class="cc-win-card">
      {resharedBy && (
        <div class="cc-win-card__reshare-header">
          <span class="cc-win-card__reshare-icon">&#8634;</span>
          <span class="cc-win-card__reshare-name">{resharedBy}</span>
          <span> shared {message.username || 'someone'}'s win:</span>
        </div>
      )}

      <div class="cc-msg" style={{ padding: 0 }}>
        <div class="cc-msg__avatar">
          {message.avatarUrl ? (
            <img src={message.avatarUrl} alt="" class="cc-msg__avatar-img" />
          ) : (
            <div class="cc-msg__avatar-placeholder">
              {(message.username || '?')[0]}
            </div>
          )}
        </div>

        <div class="cc-win-card__card">
          <div class="cc-win-card__content">
            <div class="cc-win-card__icon">{gameIcon}</div>
            <div class="cc-win-card__details">
              <div class="cc-win-card__header-row">
                <span class="cc-win-card__username">{message.username || 'Anonymous'}</span>
                <span class="cc-win-card__won-label">won on</span>
                <span class="cc-win-card__game">{game}</span>
              </div>
              <div class="cc-win-card__amount-row">
                <span class="cc-win-card__amount">
                  {win != null ? `${win.toLocaleString()} ${currency}` : '---'}
                </span>
                {multiplier != null && (
                  <span class="cc-win-card__multiplier">x{multiplier}</span>
                )}
              </div>
              {bet != null && (
                <div class="cc-win-card__bet">Bet: {bet.toLocaleString()} {currency}</div>
              )}
            </div>
          </div>

          <div class="cc-win-card__actions">
            <button class="cc-win-card__action cc-win-card__action--play">
              &#9654; Play This Game
            </button>
            <button class="cc-win-card__action cc-win-card__action--share">
              &#8634; Share
            </button>
          </div>
        </div>
      </div>

      {resharedBy && reshareComment && (
        <div class="cc-win-card__reshare-comment">{reshareComment}</div>
      )}
    </div>
  );
}
