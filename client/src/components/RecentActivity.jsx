import { useEffect, useState } from "react";
import {
  GitCommit,
  MessageSquare,
  Clock,
  Bug,
  Zap,
  Square,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const typeIcons = {
  BUG: { icon: Bug, color: "text-red-500 dark:text-red-400" },
  FEATURE: { icon: Zap, color: "text-blue-500 dark:text-blue-400" },
  TASK: { icon: Square, color: "text-green-500 dark:text-green-400" },
  IMPROVEMENT: {
    icon: MessageSquare,
    color: "text-amber-500 dark:text-amber-400",
  },
  OTHER: { icon: GitCommit, color: "text-purple-500 dark:text-purple-400" },
};

const statusColors = {
  TODO: "bg-zinc-200 text-zinc-800 dark:bg-zinc-600 dark:text-zinc-200",
  IN_PROGRESS:
    "bg-amber-200 text-amber-800 dark:bg-amber-500 dark:text-amber-900",
  PENDING_APPROVAL:
    "bg-blue-200 text-blue-800 dark:bg-blue-500 dark:text-blue-900",
  DONE: "bg-emerald-200 text-emerald-800 dark:bg-emerald-500 dark:text-emerald-900",
  ARBITRATION: "bg-red-200 text-red-800 dark:bg-red-500 dark:text-red-900",
};

const RecentActivity = () => {
  const [recentTasks, setRecentTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAccessToken, currentUser, selectedProjectId } = useAuth();

  useEffect(() => {
    fetchRecentActivity();
    // Refresh every 30 seconds to show real-time updates
    const interval = setInterval(fetchRecentActivity, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id, selectedProjectId]);

  const fetchRecentActivity = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      // Fetch recent tasks from API with real timestamps
      // The backend automatically filters by accessible projects for non-admin users
      const response = await fetch(
        `${API_BASE_URL}/tasks?limit=10&orderBy=updatedAt`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const tasks = await response.json();
        // Sort by updatedAt (most recent first) and take top 10
        const sorted = tasks
          .sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt) -
              new Date(a.updatedAt || a.createdAt)
          )
          .slice(0, 10);
        setRecentTasks(sorted || []);
      } else {
        setError("Failed to load activity");
        setRecentTasks([]);
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      setError("Network error. Please try again.");
      setRecentTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-lg transition-all overflow-hidden">
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
        <h2 className="text-lg text-zinc-800 dark:text-zinc-200">
          Recent Activity
        </h2>
      </div>

      <div className="p-0">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">
              Loading activity...
            </p>
          </div>
        ) : error ? (
          // Error state - distinct from empty state
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-1">
              Failed to load activity
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
              {error}
            </p>
            <button
              onClick={fetchRecentActivity}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-zinc-600 dark:text-zinc-500" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">
              No recent activity
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentTasks.map((task) => {
              // Most of our tasks won't have a specific "type" field.
              // Use a safe fallback so we never access `.icon` on a raw component.
              const activityType = typeIcons[task.type] || typeIcons.OTHER;
              const IconComponent = activityType.icon;
              const iconColor = activityType.color;
              const timestamp = task.updatedAt || task.createdAt;
              const formattedTime = timestamp
                ? format(new Date(timestamp), "MMM d, h:mm a")
                : "Recently";

              return (
                <div
                  key={task.id}
                  className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg">
                      <IconComponent className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-zinc-800 dark:text-zinc-200 truncate">
                          {task.title}
                        </h4>
                        <span
                          className={`ml-2 px-2 py-1 rounded text-xs ${
                            statusColors[task.status] ||
                            "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {task.status?.replace("_", " ") || "UNKNOWN"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {task.assignee?.name && (
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-zinc-300 dark:bg-zinc-700 rounded-full flex items-center justify-center text-[10px] text-zinc-800 dark:text-zinc-200">
                              {task.assignee.name[0]?.toUpperCase() || "?"}
                            </div>
                            <span>{task.assignee.name}</span>
                          </div>
                        )}
                        <span className="text-zinc-400 dark:text-zinc-500">
                          {formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
