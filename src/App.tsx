import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { ProtectedRoute } from '@/components';
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  DashboardPage,
  LeaguesPage,
  CreateLeaguePage,
  LeagueDetailPage,
  TeamDetailPage,
  ProfilePage,
  AwardsPage,
} from '@/pages';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/leagues/create" element={<ProtectedRoute><DashboardLayout><CreateLeaguePage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/leagues" element={<ProtectedRoute><DashboardLayout><LeaguesPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/leagues/:leagueId" element={<ProtectedRoute><DashboardLayout><LeagueDetailPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/leagues/:leagueId/awards" element={<ProtectedRoute><DashboardLayout><AwardsPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/teams/:teamId" element={<ProtectedRoute><DashboardLayout><TeamDetailPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardLayout><ProfilePage /></DashboardLayout></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
