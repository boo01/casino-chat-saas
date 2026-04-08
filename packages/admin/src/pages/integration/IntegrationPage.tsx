import React, { useState, useMemo } from 'react';
import { useAuth } from '../../store/auth';
import { Code, Copy, Check, Palette, BookOpen, KeyRound, AlertCircle } from 'lucide-react';

export function IntegrationPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  // Theme configuration state
  const [primaryColor, setPrimaryColor] = useState('#6366F1');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [width, setWidth] = useState(380);
  const [height, setHeight] = useState(600);
  const [serverUrl, setServerUrl] = useState(
    typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? window.location.origin
      : 'http://localhost:3000'
  );

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const embedSnippet = useMemo(() => {
    return `<script src="${serverUrl}/widget-assets/casino-chat.umd.js"></script>
<link rel="stylesheet" href="${serverUrl}/widget-assets/casino-chat.css">
<script>
  CasinoChat.init({
    tenantId: '${tenantId || 'YOUR_TENANT_ID'}',
    serverUrl: '${serverUrl}',
    playerToken: null,
    theme: {
      primaryColor: '${primaryColor}',
      position: '${position}',
      width: ${width},
      height: ${height}
    }
  });
</script>`;
  }, [tenantId, serverUrl, primaryColor, position, width, height]);

  const jwtPayloadExample = `{
  "externalId": "player-123",
  "username": "LuckyPlayer",
  "avatarUrl": "https://example.com/avatar.png",
  "level": 5,
  "vipStatus": "GOLD"
}`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Super admins have no tenantId
  if (!tenantId) {
    return (
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-6">Integration</h2>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 text-text-muted">
            <AlertCircle size={20} className="text-yellow-400" />
            <p className="text-sm">Integration settings are available per tenant.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-6">Integration</h2>

      <div className="space-y-6">
        {/* Quick Start Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code size={18} className="text-indigo-400" />
            <h3 className="text-lg font-semibold text-text-primary">Quick Start</h3>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Add this snippet to your casino site to embed the chat widget. The code updates live as you change theme settings below.
          </p>
          <pre className="bg-page border border-border rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre">
            {embedSnippet}
          </pre>
          <button
            onClick={() => copyToClipboard(embedSnippet, 'embed')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {copiedField === 'embed' ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Theme Configuration Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-indigo-400" />
            <h3 className="text-lg font-semibold text-text-primary">Theme Configuration</h3>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Customize the widget appearance. Changes update the embed code above in real time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Server URL</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as 'bottom-right' | 'bottom-left')}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                min={300}
                max={600}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min={400}
                max={900}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* SDK Reference Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-indigo-400" />
            <h3 className="text-lg font-semibold text-text-primary">SDK Reference</h3>
          </div>
          <p className="text-sm text-text-muted mb-4">
            All configuration options for <code className="text-indigo-400">CasinoChat.init()</code>.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 text-text-muted font-medium">Option</th>
                  <th className="py-2 pr-4 text-text-muted font-medium">Type</th>
                  <th className="py-2 pr-4 text-text-muted font-medium">Required</th>
                  <th className="py-2 pr-4 text-text-muted font-medium">Default</th>
                  <th className="py-2 text-text-muted font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-text-primary">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-indigo-400">tenantId</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4 text-green-400">Yes</td>
                  <td className="py-2 pr-4 text-text-muted">&mdash;</td>
                  <td className="py-2">Your unique tenant identifier</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-indigo-400">serverUrl</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4 text-text-muted">No</td>
                  <td className="py-2 pr-4 font-mono text-xs">window.location.origin</td>
                  <td className="py-2">Chat server URL</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-indigo-400">playerToken</td>
                  <td className="py-2 pr-4">string | null</td>
                  <td className="py-2 pr-4 text-text-muted">No</td>
                  <td className="py-2 pr-4 font-mono text-xs">null</td>
                  <td className="py-2">Player JWT for authenticated mode; null for guest (read-only)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-indigo-400">containerId</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4 text-text-muted">No</td>
                  <td className="py-2 pr-4 font-mono text-xs">casino-chat-widget</td>
                  <td className="py-2">DOM element ID for widget mount point</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-indigo-400">theme</td>
                  <td className="py-2 pr-4">object</td>
                  <td className="py-2 pr-4 text-text-muted">No</td>
                  <td className="py-2 pr-4 text-text-muted">&mdash;</td>
                  <td className="py-2">Theme overrides (primaryColor, position, width, height)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-indigo-400">locale</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4 text-text-muted">No</td>
                  <td className="py-2 pr-4 font-mono text-xs">en</td>
                  <td className="py-2">Widget language code</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-indigo-400">defaultChannel</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4 text-text-muted">No</td>
                  <td className="py-2 pr-4 text-text-muted">&mdash;</td>
                  <td className="py-2">Channel to join on connect (uses tenant default if omitted)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Authentication Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={18} className="text-indigo-400" />
            <h3 className="text-lg font-semibold text-text-primary">Authentication</h3>
          </div>
          <p className="text-sm text-text-muted mb-4">
            To enable authenticated chat, pass a <code className="text-indigo-400">playerToken</code> JWT
            signed with the API Secret from your{' '}
            <span className="text-indigo-400">Settings</span> page.
            The JWT payload should contain the player's data:
          </p>
          <pre className="bg-page border border-border rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre">
            {jwtPayloadExample}
          </pre>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => copyToClipboard(jwtPayloadExample, 'jwt')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-input border border-border rounded-lg hover:border-indigo-500 transition-colors text-sm text-text-muted"
            >
              {copiedField === 'jwt' ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
              Copy Example
            </button>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-indigo-400 mt-0.5">&#8226;</span>
              <p className="text-text-muted">
                Sign the JWT using the <strong className="text-text-primary">API Secret</strong> from
                the Settings page with the <code className="text-indigo-400">HS256</code> algorithm.
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-indigo-400 mt-0.5">&#8226;</span>
              <p className="text-text-muted">
                Without a <code className="text-indigo-400">playerToken</code>, the widget connects
                in <strong className="text-text-primary">guest mode</strong> (read-only &mdash; players
                can view messages but cannot send them).
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-indigo-400 mt-0.5">&#8226;</span>
              <p className="text-text-muted">
                Include <code className="text-indigo-400">externalId</code> to link the chat user
                back to the player in your casino system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
