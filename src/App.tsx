import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './components/DashboardPage';
import { TeamsPage } from './components/TeamsPage';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { JoinTeamPage } from './components/JoinTeamPage';
import { ProfilePage } from './components/ProfilePage';
import { TeamDetailsPage } from './components/TeamDetailsPage';
import { NotificationsPage } from './components/NotificationsPage';
import { LandingPage } from './components/LandingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Protected App Routes */}
      <Route path="/app" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="teams/:teamId" element={<TeamDetailsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="join/:teamId" element={<JoinTeamPage />} />
      </Route>

      {/* Legacy Join Route - Redirect or Handle */}
      {/* Keeping legacy join route direct for simplicity, or moving under /app/join */}
    </Routes>
  );
}

export default App;
