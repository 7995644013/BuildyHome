import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./pages/Layout";
import { Toaster } from "react-hot-toast";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import ProjectDetails from "./pages/ProjectDetails";
import TaskDetails from "./pages/TaskDetails";
import Login from "./pages/Login";
import TenantSelector from "./pages/TenantSelector";
import ChangePassword from "./pages/ChangePassword";
import UserManagement from "./pages/UserManagement";
import GlobalDashboard from "./pages/GlobalDashboard";
import Approvals from "./pages/Approvals";
import { useAuth } from "./contexts/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route
          path="/select-project"
          element={
            <ProtectedRoute>
              <TenantSelector />
            </ProtectedRoute>
          }
        />
        <Route
          path="/global-dashboard"
          element={
            <ProtectedRoute>
              <GlobalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="team" element={<Team />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projectsDetail" element={<ProjectDetails />} />
          <Route path="taskDetails" element={<TaskDetails />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="approvals" element={<Approvals />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
