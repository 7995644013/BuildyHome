import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  PlusIcon,
  SettingsIcon,
  BarChart3Icon,
  CalendarIcon,
  FileStackIcon,
  ZapIcon,
  InfoIcon,
  DollarSign,
  Loader2,
  FileText,
  Package,
  Bug,
} from "lucide-react";
import ProjectAnalytics from "../components/ProjectAnalytics";
import ProjectSettings from "../components/ProjectSettings";
import ProjectInfoView from "../components/ProjectInfoView";
import DailyReport from "../components/DailyReport";
import CreateTaskDialog from "../components/CreateTaskDialog";
import ProjectCalendar from "../components/ProjectCalendar";
import ProjectTasks from "../components/ProjectTasks";
import ProjectFinancials from "../components/ProjectFinancials";

import MaterialsManager from "../components/MaterialsManager";
import Tickets from "../components/Tickets";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ProjectDetail() {
  const { isAdmin, isProjectManager, isClient, getAccessToken, currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const canCreateTask = (isAdmin || isProjectManager) && !isSuperAdmin;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const id = searchParams.get("id");

  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [activeTab, setActiveTab] = useState(tab || "tasks");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (id) {
      fetchProjectAndTasks(id);
    }
  }, [id]);

  const fetchProjectAndTasks = async (projectId) => {
    setIsLoading(true);
    try {
      const token = getAccessToken();
      
      // Fetch project
      const projectResponse = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData);
      } else {
        toast.error("Failed to load project");
        return;
      }

      // Fetch tasks for this project
      const tasksResponse = await fetch(`${API_BASE_URL}/tasks?projectId=${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData || []);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
      toast.error("Network error loading project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskUpdate = () => {
    fetchProjectAndTasks(id);
  };

  const statusColors = {
    PLANNING: "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-200",
    ACTIVE:
      "bg-emerald-200 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-900",
    ON_HOLD:
      "bg-amber-200 text-amber-900 dark:bg-amber-500 dark:text-amber-900",
    COMPLETED: "bg-blue-200 text-blue-900 dark:bg-blue-500 dark:text-blue-900",
    CANCELLED: "bg-red-200 text-red-900 dark:bg-red-500 dark:text-red-900",
  };

  // Show loading state first - BEFORE checking if project exists
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-zinc-400">Loading project...</p>
        </div>
      </div>
    );
  }

  // Only show "not found" after loading is complete
  if (!project) {
    return (
      <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
        <p className="text-3xl md:text-5xl mt-40 mb-10">Project not found</p>
        <button
          onClick={() => navigate("/projects")}
          className="mt-4 px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto text-zinc-900 dark:text-white">
      {/* Header */}
      <div className="flex max-md:flex-col gap-4 flex-wrap items-start justify-between max-w-6xl">
        <div className="flex items-center gap-4">
          <button
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            onClick={() => navigate("/projects")}
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium">{project.name}</h1>
            <span
              className={`px-2 py-1 rounded text-xs capitalize ${
                statusColors[project.status]
              }`}
            >
              {project.status.replace("_", " ")}
            </span>
          </div>
        </div>
        {canCreateTask && (
          <button
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          >
            <PlusIcon className="size-4" />
            New Task
          </button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:flex flex-wrap gap-6">
        {[
          {
            label: "Total Tasks",
            value: tasks.length,
            color: "text-zinc-900 dark:text-white",
          },
          {
            label: "Completed",
            value: tasks.filter((t) => t.status === "DONE" || (t.userApproved && t.adminApproved)).length,
            color: "text-emerald-700 dark:text-emerald-400",
          },
          {
            label: "In Progress",
            value: tasks.filter(
              (t) => t.status === "IN_PROGRESS" || t.status === "TODO" || t.status === "PENDING_APPROVAL"
            ).length,
            color: "text-amber-700 dark:text-amber-400",
          },
          {
            label: "Team Members",
            value: project.assignments?.length || project.assignedUsers?.length || project.members?.length || 0,
            color: "text-blue-700 dark:text-blue-400",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex justify-between sm:min-w-60 p-4 py-2.5 rounded"
          >
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {card.label}
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </div>
            <ZapIcon className={`size-4 ${card.color}`} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div>
        <div className="inline-flex flex-wrap max-sm:grid grid-cols-3 gap-2 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
          {[
            { key: "tasks", label: "Tasks", icon: FileStackIcon },
            { key: "calendar", label: "Calendar", icon: CalendarIcon },
            { key: "analytics", label: "Analytics", icon: BarChart3Icon },
            ...(isAdmin || isProjectManager
              ? [
                  { key: "financials", label: "Financials", icon: DollarSign },
                  { key: "materials", label: "Materials", icon: Package },
                  { key: "reports", label: "Reports", icon: FileText },
                  { key: "settings", label: "Settings", icon: SettingsIcon },
                ]
              : isClient
              ? [{ key: "financials", label: "Financials", icon: DollarSign }]
              : [{ key: "info", label: "Project Info", icon: InfoIcon }]),
             ...((isAdmin || isProjectManager || isClient) ? [{ key: "tickets", label: "Tickets", icon: Bug }] : []),
          ].map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => {
                setActiveTab(tabItem.key);
                setSearchParams({ id: id, tab: tabItem.key });
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                activeTab === tabItem.key
                  ? "bg-zinc-100 dark:bg-zinc-800/80"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              <tabItem.icon className="size-3.5" />
              {tabItem.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "tasks" && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectTasks tasks={tasks} projectId={id} onTaskUpdate={handleTaskUpdate} />
            </div>
          )}
          {activeTab === "analytics" && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectAnalytics tasks={tasks} project={project} />
            </div>
          )}
          {activeTab === "calendar" && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectCalendar tasks={tasks} />
            </div>
          )}
          {activeTab === "financials" && (isAdmin || isProjectManager || isClient) && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectFinancials projectId={id} />
            </div>
          )}
          {activeTab === "reports" && (isAdmin || isProjectManager) && (
            <div className="space-y-6 dark:bg-zinc-900/40 rounded max-w-6xl p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Daily Reports</h2>
              <DailyReport projectId={id} />
            </div>
          )}
          {activeTab === "materials" && (isAdmin || isProjectManager) && (
            <div className="space-y-6 dark:bg-zinc-900/40 rounded max-w-6xl p-6">
              <MaterialsManager projectId={id} />
            </div>
          )}
          {activeTab === "settings" && (isAdmin || isProjectManager) && (
            <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
              <ProjectSettings project={project} onProjectUpdate={handleTaskUpdate} />
            </div>
          )}
          {activeTab === "info" && !isAdmin && (
            <div className="space-y-6 dark:bg-zinc-900/40 rounded max-w-6xl p-6">
              <ProjectInfoView project={project} />
              <div className="mt-6">
                <DailyReport projectId={id} />
              </div>
            </div>
          )}
          {activeTab === "tickets" && (
             <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
               <Tickets projectId={id} />
             </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskDialog
          showCreateTask={showCreateTask}
          setShowCreateTask={setShowCreateTask}
          projectId={id}
          onTaskCreated={handleTaskUpdate}
        />
      )}
    </div>
  );
}
