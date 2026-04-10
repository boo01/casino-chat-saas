import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

const EMOJI_SECTIONS = [
  {
    label: 'Smileys',
    emojis: ['😀', '😂', '🥰', '😎', '🤑', '🥳'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙏', '💪', '🤝'],
  },
  {
    label: 'Hearts',
    emojis: ['🔥', '❤️', '💰', '🎉', '🏆', '⭐'],
  },
  {
    label: 'Objects',
    emojis: ['🎰', '🎲', '🃏', '💎', '🚀', '🍀'],
  },
  {
    label: 'Reactions',
    emojis: ['😱', '🤔', '😴', '🤯', '🥶', '😈'],
  },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: Props) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div class="cc-emoji-picker" ref={pickerRef}>
      <div class="cc-emoji-picker__header">
        <span class="cc-emoji-picker__label">Emoji</span>
        <button class="cc-emoji-picker__close" onClick={onClose}>
          &#10005;
        </button>
      </div>
      {EMOJI_SECTIONS.map((section) => (
        <div key={section.label}>
          <div class="cc-emoji-picker__section-label">{section.label}</div>
          <div class="cc-emoji-picker__grid">
            {section.emojis.map((emoji) => (
              <button
                key={emoji}
                class="cc-emoji-picker__item"
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
