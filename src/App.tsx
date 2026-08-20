import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { ProtectedRoute } from '@/components';
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  DashboardPage,
  LeaguesPage,
  LeagueDetailPage,
  TeamDetailPage,
  ProfilePage,
} from '@/pages';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/leagues"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LeaguesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/leagues/:leagueId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LeagueDetailPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/teams/:teamId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TeamDetailPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
