import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
  onClaim?: () => void;
  isGuest?: boolean;
}

export function RainEvent({ message, onClaim, isGuest }: Props) {
  const { content } = message;
  const initiator = content?.initiator || 'Someone';
  const amount = content?.amount;
  const currency = content?.currency || 'USD';
  const playerCount = content?.playerCount;
  const perPlayer = content?.perPlayer;
  const duration = content?.duration || content?.timeLeft || 60;

  // Calculate actual remaining time from message creation
  const calcRemaining = (): number => {
    const createdAt = new Date(message.createdAt).getTime();
    const expiresAt = createdAt + duration * 1000;
    const remaining = Math.floor((expiresAt - Date.now()) / 1000);
    return Math.max(0, remaining);
  };

  const [timeLeft, setTimeLeft] = useState<number>(calcRemaining());
  const [collected, setCollected] = useState(false);
  const expired = timeLeft <= 0 && !collected;

  useEffect(() => {
    if (timeLeft <= 0 || collected) return;
    const timer = setInterval(() => {
      const remaining = calcRemaining();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [collected]);

  const handleCollect = useCallback(() => {
    if (isGuest || expired) return;
    setCollected(true);
    if (onClaim) onClaim();
  }, [onClaim, isGuest, expired]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div class="cc-rain-event">
      <div class={`cc-rain-event__card ${timeLeft > 0 && !collected ? 'cc-rain-event__card--active' : ''}`}>
        {collected ? (
          <div class="cc-rain-event__collected">
            {'\u2705'} Rain collected!{' '}
            {perPlayer != null ? `${perPlayer.toLocaleString()} ${currency} per player` : ''}
          </div>
        ) : expired ? (
          <div class="cc-rain-event__collected">
            {'\uD83C\uDF27\uFE0F'} Rain event ended {'\u2014'} {initiator} rained{' '}
            {amount != null ? `${amount.toLocaleString()} ${currency}` : ''}
          </div>
        ) : (
          <div>
            <div class="cc-rain-event__title">
              {'\uD83C\uDF27\uFE0F'} RAIN EVENT {'\u2014'} {initiator} is raining{' '}
              {amount != null ? `${amount.toLocaleString()} ${currency}` : ''} on chat!
            </div>
            <div class="cc-rain-event__footer">
              <div class="cc-rain-event__info">
                {playerCount != null && playerCount > 0 && <span>{playerCount} players eligible</span>}
              </div>
              <div class="cc-rain-event__actions">
                <span class="cc-rain-event__timer">{formatTime(timeLeft)}</span>
                <button
                  class="cc-rain-event__collect"
                  onClick={!isGuest ? handleCollect : undefined}
                  disabled={isGuest}
                  style={isGuest ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  {isGuest ? 'Sign in to collect' : `\u2614 Collect`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
