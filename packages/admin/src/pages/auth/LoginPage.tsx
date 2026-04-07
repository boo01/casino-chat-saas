import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import api from '../../api/client';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<'tenant' | 'super'>('tenant');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = loginType === 'super' ? '/super-admin/auth/login' : '/auth/login';
      // For tenant admin, use /auth/login directly (not under /api)
      const baseUrl = loginType === 'super' ? '/api' : '';
      const res = await (loginType === 'super'
        ? api.post('/super-admin/auth/login', { email, password })
        : api.post('/auth/login', { email, password }));

      const data = res.data;
      const user = loginType === 'super'
        ? { ...data.admin, isSuperAdmin: true }
        : { id: data.accessToken, email, role: 'ADMIN' };

      login(data.accessToken, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">CasinoChat Admin</h1>
        <p className="text-text-muted mb-6">Sign in to manage your casino chat</p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setLoginType('tenant')}
            className={`flex-1 py-2 text-sm rounded-lg ${loginType === 'tenant' ? 'bg-indigo-600 text-white' : 'bg-input text-text-secondary'}`}
          >
            Tenant Admin
          </button>
          <button
            onClick={() => setLoginType('super')}
            className={`flex-1 py-2 text-sm rounded-lg ${loginType === 'super' ? 'bg-indigo-600 text-white' : 'bg-input text-text-secondary'}`}
          >
            Super Admin
          </button>
        </div>

        {error && <div className="bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
              placeholder="admin@casino.com" required
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
              placeholder="********" required
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
