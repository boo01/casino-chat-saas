import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
  onClaim?: () => void;
}

export function RainEvent({ message, onClaim }: Props) {
  const { content } = message;
  const initiator = content?.initiator || 'Someone';
  const amount = content?.amount;
  const currency = content?.currency || 'USD';
  const playerCount = content?.playerCount;
  const perPlayer = content?.perPlayer;
  const initialTimeLeft = content?.timeLeft;

  const [timeLeft, setTimeLeft] = useState<number>(initialTimeLeft ?? 0);
  const [collected, setCollected] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0 || collected) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [collected]);

  const handleCollect = useCallback(() => {
    setCollected(true);
    if (onClaim) onClaim();
  }, [onClaim]);

  return (
    <div class="cc-rain-event">
      <div class={`cc-rain-event__card ${!collected ? 'cc-rain-event__card--active' : ''}`}>
        {!collected ? (
          <div>
            <div class="cc-rain-event__title">
              &#127783;&#65039; RAIN EVENT &mdash; {initiator} is raining{' '}
              {amount != null ? `${amount.toLocaleString()} ${currency}` : ''} on chat!
            </div>
            <div class="cc-rain-event__footer">
              <div class="cc-rain-event__info">
                {playerCount != null && <span>{playerCount} players eligible</span>}
              </div>
              <div class="cc-rain-event__actions">
                {timeLeft > 0 && (
                  <span class="cc-rain-event__timer">{timeLeft}s</span>
                )}
                <button class="cc-rain-event__collect" onClick={handleCollect}>
                  &#9748; Collect
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div class="cc-rain-event__collected">
            &#9989; Rain collected!{' '}
            {perPlayer != null ? `${perPlayer.toLocaleString()} ${currency} per player` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
