import { FolderOpen, CheckCircle, Users, AlertTriangle, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function StatsGrid() {
  const { currentUser, isAdmin, getAccessToken } = useAuth();

  const [stats, setStats] = useState({
    totalProjects: 0,
    completedTasks: 0,
    myTasks: 0,
    overdueIssues: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, [currentUser?.id, currentUser?.role]);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalProjects: data.totalProjects || 0,
          completedTasks: data.completedTasks || 0,
          myTasks: data.myTasks || 0,
          overdueIssues: data.overdueIssues || 0,
        });
      } else {
        setError("Failed to load dashboard stats");
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      icon: FolderOpen,
      title: "Total Projects",
      value: stats.totalProjects,
      subtitle: isAdmin ? "all projects" : "assigned to me",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-500",
    },
    {
      icon: CheckCircle,
      title: "Completed Tasks",
      value: stats.completedTasks,
      subtitle: "tasks completed",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-500",
    },
    {
      icon: Users,
      title: isAdmin ? "Total Tasks" : "My Tasks",
      value: stats.myTasks,
      subtitle: isAdmin ? "across all projects" : "assigned to me",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-500",
    },
    {
      icon: AlertTriangle,
      title: "Overdue",
      value: stats.overdueIssues,
      subtitle: "need attention",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-9">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md p-6 py-4"
          >
            <div className="flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-blue-500" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state with retry button
  if (error) {
    return (
      <div className="my-9">
        <div className="bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                <AlertCircle className="size-5 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Failed to load stats</p>
                <p className="text-sm text-gray-500 dark:text-zinc-400">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchDashboardStats}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition"
            >
              <RefreshCw className="size-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-9">
      {statCards.map(
        ({ icon: Icon, title, value, subtitle, bgColor, textColor }, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition duration-200 rounded-md"
          >
            <div className="p-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    {title}
                  </p>
                  <p className="text-3xl font-bold text-zinc-800 dark:text-white">
                    {value}
                  </p>
                  {subtitle && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20`}>
                  <Icon size={20} className={textColor} />
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
