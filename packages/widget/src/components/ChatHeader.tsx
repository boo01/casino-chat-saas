import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import type { Channel } from '../types';

interface Props {
  isConnected: boolean;
  onlineCount: number;
  channels: Channel[];
  currentChannel: Channel | null;
  onChannelSelect: (id: string) => void;
  onClose?: () => void;
}

export function ChatHeader({
  isConnected,
  onlineCount,
  channels,
  currentChannel,
  onChannelSelect,
  onClose,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const handleChannelClick = (channelId: string) => {
    onChannelSelect(channelId);
    setDropdownOpen(false);
  };

  const channelEmoji = currentChannel?.emoji || '💬';
  const channelName = currentChannel?.name || 'Chat';

  return (
    <div class="cc-header" ref={dropdownRef}>
      <div class="cc-header__left">
        <div
          class="cc-channel-select"
          onClick={() => channels.length > 0 && setDropdownOpen(!dropdownOpen)}
        >
          <span class="cc-channel-select__emoji">{channelEmoji}</span>
          <span class="cc-channel-select__name">{channelName}</span>
          {channels.length > 0 && (
            <svg
              class={`cc-channel-select__chevron ${dropdownOpen ? 'cc-channel-select__chevron--open' : ''}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          )}
          <span class="cc-channel-select__online">
            <span class={`cc-dot ${isConnected ? 'cc-dot--online' : 'cc-dot--offline'}`} />
            {onlineCount > 0 ? onlineCount : ''}
          </span>
        </div>
      </div>

      <div class="cc-header__right">
        {onClose && (
          <button class="cc-header__close" onClick={onClose} aria-label="Close chat">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 1l12 12M1 13L13 1" />
            </svg>
          </button>
        )}
      </div>

      {/* Channel dropdown */}
      {dropdownOpen && channels.length > 0 && (
        <div class="cc-channel-dropdown">
          {channels.map((ch) => (
            <div
              key={ch.id}
              class={`cc-channel-dropdown__item ${currentChannel?.id === ch.id ? 'cc-channel-dropdown__item--active' : ''}`}
              onClick={() => handleChannelClick(ch.id)}
            >
              <span class="cc-channel-dropdown__emoji">{ch.emoji || '💬'}</span>
              <div class="cc-channel-dropdown__info">
                <span class="cc-channel-dropdown__name">{ch.name}</span>
                {ch.description && (
                  <span class="cc-channel-dropdown__desc">{ch.description}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
