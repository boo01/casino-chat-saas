import { h } from 'preact';
import type { ChatConfig } from './types';
import { ChatWidget } from './components/ChatWidget';

interface Props {
  config: ChatConfig;
}

export function App({ config }: Props) {
  return <ChatWidget config={config} />;
}
