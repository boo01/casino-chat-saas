import { h } from 'preact';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
  onAnswer?: (index: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function TriviaCard({ message, onAnswer }: Props) {
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
          &#129504; CHAT TRIVIA &mdash; {question}
        </div>

        <div class="cc-trivia-card__grid">
          {options.map((opt, i) => {
            const isCorrect = resolved && i === correctIndex;
            const isWrong = resolved && i !== correctIndex;
            let cls = 'cc-trivia-card__option';
            if (isCorrect) cls += ' cc-trivia-card__option--correct';
            else if (isWrong) cls += ' cc-trivia-card__option--wrong';

            return (
              <button
                key={i}
                class={cls}
                disabled={resolved}
                onClick={() => {
                  if (!resolved && onAnswer) onAnswer(i);
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

        {resolved && winner && (
          <div class="cc-trivia-card__winner">
            &#9989; Player '{winner}' answered first!{' '}
            {reward ? `+${reward}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
