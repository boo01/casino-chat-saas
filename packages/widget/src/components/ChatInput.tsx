import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';

interface Props {
  isGuest: boolean;
  onSend: (text: string) => void;
  primaryColor: string;
}

export function ChatInput({ isGuest, onSend, primaryColor }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isGuest) {
    return (
      <div class="cc-input cc-input--guest">
        <span>Sign in to chat</span>
      </div>
    );
  }

  return (
    <div class="cc-input">
      <input
        ref={inputRef}
        type="text"
        class="cc-input__field"
        placeholder="Type a message..."
        value={text}
        onInput={(e) => setText((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        maxLength={500}
      />
      <button
        class="cc-input__send"
        onClick={handleSend}
        disabled={!text.trim()}
        style={{ backgroundColor: primaryColor }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  );
}
