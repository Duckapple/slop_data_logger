import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import IncidentsList from './pages/IncidentsList';
import IncidentDetail from './pages/IncidentDetail';
import IncidentForm from './pages/IncidentForm';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InviteLanding from './pages/InviteLanding';
import { AuthProvider, RequireAuth } from './lib/auth';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/:code" element={<InviteLanding />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/incidents" element={<IncidentsList />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route
              path="/incidents/:id/edit"
              element={<IncidentForm mode="edit" />}
            />
            <Route path="/new" element={<IncidentForm mode="create" />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
