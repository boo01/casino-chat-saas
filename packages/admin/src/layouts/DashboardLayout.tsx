import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { LayoutDashboard, MessageSquare, Users, Shield, Settings, LogOut } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/channels', label: 'Channels', icon: MessageSquare },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/moderation', label: 'Moderation', icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-page">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-text-primary">CasinoChat</h1>
          <p className="text-xs text-text-muted mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.email}</p>
              <p className="text-xs text-text-muted">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-text-muted hover:text-red-400 p-1">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
