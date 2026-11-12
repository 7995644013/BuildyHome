import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatsGrid from "../components/StatsGrid";
import ProjectOverview from "../components/ProjectOverview";
import RecentActivity from "../components/RecentActivity";
import TasksSummary from "../components/TasksSummary";
import CreateProjectDialog from "../components/CreateProjectDialog";
import ArbitrationPanel from "../components/ArbitrationPanel";
import ClientProjectView from "./ClientProjectView";
import { useAuth } from "../contexts/AuthContext";
import { authenticatedFetch } from "../utils/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const Dashboard = () => {
  const { isAdmin, canManageProjects, currentUser, selectedProjectId, getAccessToken } =
    useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [arbitrationTasks, setArbitrationTasks] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) {
      fetchArbitrationTasks();
    }
    fetchUserProjects();
  }, [isAdmin, currentUser?.id]);

  const fetchArbitrationTasks = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks?status=ARBITRATION`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const tasks = await response.json();
        setArbitrationTasks(tasks || []);
      }
    } catch (error) {
      console.error("Error fetching arbitration tasks:", error);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/users/me/projects`);

      if (response.ok) {
        const projects = await response.json();
        setUserProjects(projects || []);
      }
    } catch (error) {
      console.error("Error fetching user projects:", error);
    }
  };

  // Redirect clients to read-only view
  useEffect(() => {
    if (currentUser?.role === "client" && selectedProjectId) {
      // Client view is handled by conditional rendering below
      return;
    }
  }, [currentUser?.role, selectedProjectId]);

  // Show Client Read-Only View
  if (currentUser?.role === "client" && selectedProjectId) {
    return <ClientProjectView />;
  }

  // Show Client Empty State if no project selected
  if (currentUser?.role === "client" && !selectedProjectId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Project Selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please select a project to view your dashboard.
          </p>
          <button
            onClick={() => navigate("/select-project")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Select Project
          </button>
        </div>
      </div>
    );
  }

  // Standard Dashboard for PM, SE, Admin
    return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Welcome back, {currentUser?.name || "User"}
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">
            {canManageProjects
              ? "Here's what's happening with your projects today"
              : `You are assigned to ${userProjects.length} project${
                  userProjects.length !== 1 ? "s" : ""
                }`}
          </p>
                </div>

        {canManageProjects && currentUser?.role !== "super_admin" && (
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white space-x-2 hover:opacity-90 transition"
          >
                    <Plus size={16} /> New Project
                </button>
                )}

        <CreateProjectDialog
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
        />
            </div>

            <StatsGrid />

      {/* Arbitration Panel for Admin - Show if there are tasks in arbitration */}
      {isAdmin && arbitrationTasks.length > 0 && (
        <div className="mb-8">
          <ArbitrationPanel />
        </div>
      )}

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <ProjectOverview />
                    <RecentActivity />
                </div>
        <div className="space-y-8">
                    <TasksSummary />
          {/* Show arbitration panel in sidebar if no tasks */}
          {isAdmin && arbitrationTasks.length === 0 && <ArbitrationPanel />}
                </div>
            </div>
        </div>
  );
};

export default Dashboard;
