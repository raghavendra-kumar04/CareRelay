import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import InvitePage from './pages/InvitePage';
import SettingsPage from './pages/SettingsPage';
import TasksPage from './pages/TasksPage';
import AppointmentsPage from './pages/AppointmentsPage';
import TimelinePage from './pages/TimelinePage';
import SummaryPage from './pages/SummaryPage';
import { useAuthStore } from './store/authStore';
import { useFirstFamilyAppointmentsPath, useFirstFamilyTasksPath } from './components/layout/Navbar';

function TasksRedirect() {
  const path = useFirstFamilyTasksPath();
  return <Navigate to={path} replace />;
}

function AppointmentsRedirect() {
  const path = useFirstFamilyAppointmentsPath();
  return <Navigate to={path} replace />;
}

const queryClient = new QueryClient();
let authInitStarted = false;

function App() {
  useEffect(() => {
    if (authInitStarted) return;
    authInitStarted = true;
    void useAuthStore.getState().initializeAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/tasks" element={<TasksRedirect />} />
              <Route path="/appointments" element={<AppointmentsRedirect />} />
              <Route path="/families/:fid/tasks" element={<TasksPage />} />
              <Route path="/families/:fid/appointments" element={<AppointmentsPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/summary" element={<SummaryPage />} />
            </Route>
          </Route>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
