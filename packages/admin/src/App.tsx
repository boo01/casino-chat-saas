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
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { PromosPage } from './pages/promos/PromosPage';
import { TriviaPage } from './pages/trivia/TriviaPage';
import { RainPage } from './pages/rain/RainPage';
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage';
import { TenantsPage } from './pages/super-admin/TenantsPage';
import { AdminsPage } from './pages/super-admin/AdminsPage';
import { IntegrationPage } from './pages/integration/IntegrationPage';
import { ChatPreviewPage } from './pages/chat-preview/ChatPreviewPage';
import { LiveChatPage } from './pages/live-chat/LiveChatPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <h2 className="text-2xl font-bold text-text-primary mb-2">404</h2>
      <p className="text-text-muted">Page not found</p>
    </div>
  );
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
          <Route path="promos" element={<PromosPage />} />
          <Route path="trivia" element={<TriviaPage />} />
          <Route path="rain" element={<RainPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="integration" element={<IntegrationPage />} />
          <Route path="chat-preview" element={<ChatPreviewPage />} />
          <Route path="live-chat" element={<LiveChatPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="super-admin/tenants" element={<TenantsPage />} />
          <Route path="super-admin/admins" element={<AdminsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}
