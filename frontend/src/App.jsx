import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Community from './pages/Community.jsx';
import Materials from './pages/Materials.jsx';
import LostFound from './pages/LostFound.jsx';
import Marketplace from './pages/Marketplace.jsx';
import StudyGroups from './pages/StudyGroups.jsx';
import Events from './pages/Events.jsx';
import Messages from './pages/Messages.jsx';
import Notifications from './pages/Notifications.jsx';
import RequireRole from './components/RequireRole.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminStudents from './pages/admin/AdminStudents.jsx';
import AdminContent from './pages/admin/AdminContent.jsx';
import AdminEvents from './pages/admin/AdminEvents.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminLogs from './pages/admin/AdminLogs.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import { Login, ChangePassword, VerifyEmail, ForgotPassword, ResetPassword } from './pages/AuthPages.jsx';
import { NAV } from './components/layout/nav.js';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<ProtectedRoute><RequireRole roles={['MODERATOR', 'SUPER_ADMIN']}><AdminLayout /></RequireRole></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="students" element={<RequireRole roles={['SUPER_ADMIN']}><AdminStudents /></RequireRole>} />
        <Route path="logs" element={<RequireRole roles={['SUPER_ADMIN']}><AdminLogs /></RequireRole>} />
      </Route>
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/community" element={<Community />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/lost-found" element={<LostFound />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/groups" element={<StudyGroups />} />
        <Route path="/events" element={<Events />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
        {NAV.filter(n => n.to !== '/' && n.to !== '/profile' && !['/community', '/materials', '/lost-found', '/marketplace', '/groups', '/events', '/messages', '/notifications'].includes(n.to)).map(n => <Route key={n.to} path={n.to} element={<ComingSoon />} />)}
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  );
}
