import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../store/auth';
import { RefreshCw, ExternalLink, Palette, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';

const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
];

const BACKEND_URL = 'http://localhost:3000';

function buildPreviewHtml(tenantId: string, color: string, position: string, adminToken?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chat Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #080C14; overflow: hidden; }
    #chat { width: 100%; height: 100%; }
  </style>
  <link rel="stylesheet" href="${BACKEND_URL}/widget-assets/casino-chat.css" />
</head>
<body>
  <div id="chat"></div>
  <script>
    (function() {
      var s = document.createElement('script');
      s.src = '${BACKEND_URL}/widget-assets/casino-chat.umd.js';
      s.onload = function() {
        // The UMD auto-init sets window.CasinoChat = { init, ... } directly
        if (window.CasinoChat && window.CasinoChat.init) {
          window.CasinoChat.init({
            tenantId: '${tenantId}',
            serverUrl: '${BACKEND_URL}',
            containerId: 'chat',
            mode: 'fullscreen',
            defaultOpen: true,
            playerToken: ${adminToken ? `'${adminToken}'` : 'null'},
            theme: {
              primaryColor: '${color}',
            }
          });
        } else {
          document.body.innerHTML += '<div style="position:fixed;bottom:20px;right:20px;background:#DC2626;color:white;padding:12px 16px;border-radius:8px;z-index:99999;font-size:13px">Widget init not found. Keys: ' + Object.keys(window.CasinoChat || {}).join(', ') + '</div>';
        }
      };
      s.onerror = function() {
        document.body.innerHTML += '<div style="position:fixed;bottom:20px;right:20px;background:#DC2626;color:white;padding:12px 16px;border-radius:8px;z-index:99999;font-size:13px">Failed to load widget from ${BACKEND_URL}</div>';
      };
      document.body.appendChild(s);
    })();
  </script>
</body>
</html>`;
}

export function ChatPreviewPage() {
  const { user, token } = useAuth();
  const [color, setColor] = useState('#6366F1');
  const [position, setPosition] = useState('bottom-right');
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const tenantId = user?.tenantId;

  // Use blob URL instead of srcdoc to avoid cross-origin issues
  const blobUrl = useMemo(() => {
    if (!tenantId) return '';
    const html = buildPreviewHtml(tenantId, color, position, token || undefined);
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [tenantId, color, position, reloadKey, token]);

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="bg-card border border-border rounded-xl p-8 text-center max-w-md">
          <Monitor className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Preview is available per tenant
          </h2>
          <p className="text-sm text-text-secondary">
            Log in as a tenant admin to preview the chat widget for that tenant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top controls bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-text-secondary" />
          <label className="text-sm text-text-secondary whitespace-nowrap">Primary Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary w-28"
          />
        </div>

        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-text-secondary" />
          <label className="text-sm text-text-secondary whitespace-nowrap">Position</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            {POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-2 bg-input border border-border rounded-lg px-4 py-2 text-sm text-text-primary hover:bg-border transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reload
        </button>

        <Link
          to="/integration"
          className="flex items-center gap-2 ml-auto text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Get Embed Code
        </Link>
      </div>

      {/* Iframe preview */}
      <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
        <iframe
          ref={iframeRef}
          key={reloadKey}
          src={blobUrl}
          style={{ border: 'none', width: '100%', height: '100%' }}
          title="Chat Widget Preview"
        />
      </div>
    </div>
  );
}
