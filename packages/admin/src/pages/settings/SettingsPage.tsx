import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/auth';
import api from '../../api/client';
import { Copy, Check, RefreshCw, Shield, Globe, Key, Settings } from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  BASIC: '#22C55E',
  SOCIAL: '#3B82F6',
  ENGAGE: '#F59E0B',
  MONETIZE: '#EF4444',
};

interface TenantData {
  id: string;
  name: string;
  domain: string;
  tier: string;
  isActive: boolean;
  config: any;
  webhookUrl: string | null;
  allowedIps: string[] | null;
  branding: any;
  apiKey: string;
  apiSecret: string;
  createdAt: string;
}

export function SettingsPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [allowedIps, setAllowedIps] = useState('');

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const fetchTenant = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/tenants/${tenantId}`);
        const data = res.data;
        setTenant(data);
        setName(data.name || '');
        setDomain(data.domain || '');
        setWebhookUrl(data.webhookUrl || '');
        setAllowedIps(data.allowedIps ? data.allowedIps.join(', ') : '');
      } catch (err) {
        console.error('Failed to fetch tenant:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const ips = allowedIps
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean);
      const res = await api.put(`/tenants/${tenantId}`, {
        name,
        domain,
        webhookUrl: webhookUrl || null,
        allowedIps: ips.length > 0 ? ips : null,
      });
      setTenant(res.data);
      setSaveMessage('Settings saved successfully.');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveMessage('Failed to save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!tenantId) return;
    if (!window.confirm('Regenerate API key? The current key will stop working immediately.')) return;
    try {
      const res = await api.post(`/tenants/${tenantId}/regenerate-api-key`);
      setTenant((prev) => (prev ? { ...prev, apiKey: res.data.apiKey, apiSecret: res.data.apiSecret } : prev));
    } catch (err) {
      console.error('Failed to regenerate API key:', err);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-6">Settings</h2>

      <div className="space-y-6">
        {/* Account Info Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-indigo-400" />
            <h3 className="text-lg font-semibold text-text-primary">Account</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Email</span>
              <span className="text-text-primary">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Role</span>
              <span className="text-text-primary">{user?.role}</span>
            </div>
            {user?.isSuperAdmin && (
              <div className="flex justify-between">
                <span className="text-text-muted">Type</span>
                <span className="text-indigo-400">Super Admin</span>
              </div>
            )}
          </div>
        </div>

        {/* Tenant Settings — only for tenant admins */}
        {tenantId && !loading && tenant && (
          <>
            {/* Feature Tier */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings size={18} className="text-indigo-400" />
                <h3 className="text-lg font-semibold text-text-primary">Subscription</h3>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-text-muted">Current Tier</div>
                  <span
                    className="inline-block px-3 py-1 rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: TIER_COLORS[tenant.tier] || '#6B7280' }}
                  >
                    {tenant.tier}
                  </span>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-sm text-text-muted">Status</div>
                  <span className={`text-sm font-medium ${tenant.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-sm text-text-muted">Member Since</div>
                  <span className="text-sm text-text-primary">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Tenant Config */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={18} className="text-indigo-400" />
                <h3 className="text-lg font-semibold text-text-primary">Tenant Settings</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Domain</label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Webhook URL</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-casino.com/webhooks/chat"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Allowed IPs (comma-separated)</label>
                  <input
                    type="text"
                    value={allowedIps}
                    onChange={(e) => setAllowedIps(e.target.value)}
                    placeholder="192.168.1.1, 10.0.0.1"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {saveMessage && (
                    <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                      {saveMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* API Keys */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key size={18} className="text-indigo-400" />
                <h3 className="text-lg font-semibold text-text-primary">API Keys</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">API Key</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono truncate">
                      {tenant.apiKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(tenant.apiKey, 'apiKey')}
                      className="p-2 bg-input border border-border rounded-lg hover:border-indigo-500 transition-colors"
                      title="Copy API Key"
                    >
                      {copiedField === 'apiKey' ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} className="text-text-muted" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">API Secret</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono truncate">
                      {tenant.apiSecret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(tenant.apiSecret, 'apiSecret')}
                      className="p-2 bg-input border border-border rounded-lg hover:border-indigo-500 transition-colors"
                      title="Copy API Secret"
                    >
                      {copiedField === 'apiSecret' ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} className="text-text-muted" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleRegenerateApiKey}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-600/30"
                >
                  <RefreshCw size={14} />
                  Regenerate API Keys
                </button>
                <p className="text-xs text-text-muted">
                  Regenerating will invalidate the current keys immediately. Update your integration code before regenerating.
                </p>
              </div>
            </div>
          </>
        )}

        {tenantId && loading && (
          <div className="text-text-muted">Loading tenant settings...</div>
        )}
      </div>
    </div>
  );
}
