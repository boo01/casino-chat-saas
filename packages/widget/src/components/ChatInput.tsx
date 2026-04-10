import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';

interface Props {
  isGuest: boolean;
  onSend: (text: string) => void;
  primaryColor: string;
  onlineCount: number;
}

const QUICK_EMOJIS = [
  '😀', '😂', '🤣', '😍', '🥳', '🔥', '💰', '🎰',
  '🎲', '🃏', '💎', '🏆', '🎉', '👑', '💸', '🤑',
  '😎', '🙌', '💪', '❤️', '👍', '👎', '😱', '🍀',
];

export function ChatInput({ isGuest, onSend, primaryColor, onlineCount }: Props) {
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  if (isGuest) {
    return (
      <div class="cc-input--guest">
        <span class="cc-input--guest__icon">🔒</span>
        <span>Sign in to chat</span>
      </div>
    );
  }

  return (
    <div class="cc-input" style={{ position: 'relative' }}>
      {/* Emoji picker */}
      {showEmojis && (
        <div class="cc-emoji-picker">
          <div class="cc-emoji-picker__grid">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                class="cc-emoji-picker__item"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div class="cc-input__row">
        <input
          ref={inputRef}
          type="text"
          class="cc-input__field"
          placeholder="Type your message..."
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
        />
        <button
          class="cc-input__emoji-btn"
          onClick={() => setShowEmojis(!showEmojis)}
          aria-label="Toggle emoji picker"
        >
          😊
        </button>
        <button
          class="cc-input__send"
          onClick={handleSend}
          disabled={!text.trim()}
          style={{ backgroundColor: primaryColor }}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Footer bar */}
      <div class="cc-footer">
        <div class="cc-footer__online">
          <span class="cc-dot cc-dot--online" />
          <span>Online: {onlineCount}</span>
        </div>
      </div>
    </div>
  );
}
