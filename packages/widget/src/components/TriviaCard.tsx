import { h } from 'preact';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
  onAnswer?: (index: number) => void;
  isGuest?: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function TriviaCard({ message, onAnswer, isGuest }: Props) {
  const { content } = message;
  const question = content?.question || 'Trivia Question';
  const options = content?.options || [];
  const resolved = content?.resolved || false;
  const correctIndex = content?.correctIndex;
  const winner = content?.winner;
  const reward = content?.reward;

  return (
    <div class="cc-trivia-card">
      <div class="cc-trivia-card__card">
        <div class="cc-trivia-card__title">
          {'\uD83E\uDDE0'} CHAT TRIVIA {'\u2014'} {question}
        </div>

        <div class="cc-trivia-card__grid">
          {options.map((opt: string, i: number) => {
            const isCorrect = resolved && i === correctIndex;
            const isWrong = resolved && i !== correctIndex;
            let cls = 'cc-trivia-card__option';
            if (isCorrect) cls += ' cc-trivia-card__option--correct';
            else if (isWrong) cls += ' cc-trivia-card__option--wrong';

            return (
              <button
                key={i}
                class={cls}
                disabled={resolved || isGuest}
                style={isGuest ? { opacity: 0.5 } : undefined}
                onClick={() => {
                  if (!resolved && !isGuest && onAnswer) onAnswer(i);
                }}
              >
                <span class="cc-trivia-card__option-label">
                  {OPTION_LABELS[i] || String(i + 1)})
                </span>{' '}
                {opt}
              </button>
            );
          })}
        </div>

        {isGuest && !resolved && (
          <div style={{ color: '#9CA3AF', fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
            Sign in to answer
          </div>
        )}

        {resolved && winner && (
          <div class="cc-trivia-card__winner">
            {'\u2705'} Player '{winner}' answered first!{' '}
            {reward ? `+${reward}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
