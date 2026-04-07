import { h } from 'preact';

interface Props {
  isConnected: boolean;
  onlineCount: number;
  channelName: string;
  primaryColor: string;
  onClose: () => void;
  onChannelSelect: (id: string) => void;
}

export function ChatHeader({ isConnected, onlineCount, channelName, primaryColor, onClose }: Props) {
  return (
    <div class="cc-header" style={{ backgroundColor: primaryColor }}>
      <div class="cc-header__info">
        <span class="cc-header__title">{channelName}</span>
        <span class="cc-header__status">
          <span class={`cc-dot ${isConnected ? 'cc-dot--online' : 'cc-dot--offline'}`} />
          {onlineCount > 0 ? `${onlineCount} online` : isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
      <button class="cc-header__close" onClick={onClose}>✕</button>
    </div>
  );
}
