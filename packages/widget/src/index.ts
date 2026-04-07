import { h, render } from 'preact';
import { App } from './App';
import type { ChatConfig } from './types';
import './styles/widget.css';

export type { ChatConfig } from './types';

export const CasinoChat = {
  init(config: ChatConfig) {
    const containerId = config.containerId || 'casino-chat-widget';
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    render(h(App, { config }), container);

    return {
      destroy() {
        if (container) {
          render(null, container);
          container.remove();
        }
      },
    };
  },
};

// Auto-init from global config
if (typeof window !== 'undefined') {
  (window as any).CasinoChat = CasinoChat;
}

export default CasinoChat;
