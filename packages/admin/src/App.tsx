import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, useAuthState, useAuth } from './store/auth';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ChannelListPage } from './pages/channels/ChannelListPage';
import { PlayerListPage } from './pages/players/PlayerListPage';
import { ModerationPage } from './pages/moderation/ModerationPage';
import { SettingsPage } from './pages/settings/SettingsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="channels" element={<ChannelListPage />} />
          <Route path="players" element={<PlayerListPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}
