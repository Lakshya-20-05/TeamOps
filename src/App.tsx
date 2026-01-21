import { Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { ProjectsPage } from './components/ProjectsPage';
import { ActivitiesPage } from './components/ActivitiesPage';
import { ActivityTasksPage } from './components/ActivityTasksPage';

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
        <Route path="teams/:teamId/projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ActivitiesPage />} />
        <Route path="activities/:activityId/tasks" element={<ActivityTasksPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="join/:teamId" element={<JoinTeamPage />} />
      </Route>

      {/* Redirect Legacy Join Links */}
      <Route path="/join/:teamId" element={<JoinRedirect />} />
    </Routes>
  );
}

function JoinRedirect() {
  const { teamId } = useParams();
  return <Navigate to={`/app/join/${teamId}`} replace />;
}

export default App;
