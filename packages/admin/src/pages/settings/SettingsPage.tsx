import React from 'react';
import { useAuth } from '../../store/auth';

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-6">Settings</h2>
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Account</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-text-muted">Email</span><span className="text-text-primary">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Role</span><span className="text-text-primary">{user?.role}</span></div>
          {user?.isSuperAdmin && <div className="flex justify-between"><span className="text-text-muted">Type</span><span className="text-indigo-400">Super Admin</span></div>}
        </div>
      </div>
    </div>
  );
}
