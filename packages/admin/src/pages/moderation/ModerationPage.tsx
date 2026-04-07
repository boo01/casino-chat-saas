import React from 'react';

export function ModerationPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-6">Moderation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Banned Words</h3>
          <p className="text-text-muted text-sm">Manage word filters for your chat channels.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Moderation Log</h3>
          <p className="text-text-muted text-sm">View recent moderation actions taken by admins.</p>
        </div>
      </div>
    </div>
  );
}
