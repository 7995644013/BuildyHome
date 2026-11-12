import { useEffect, useState } from "react";
import { ArrowRight, Clock, AlertTriangle, User, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function TasksSummary() {
  const { currentUser, getAccessToken } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [currentUser?.id]);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data || []);
      } else {
        setError("Failed to load tasks");
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const myTasks = tasks.filter((i) => i.assigneeId === currentUser?.id);
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE" && !(t.userApproved && t.adminApproved)
  );
  const inProgressIssues = tasks.filter((i) => i.status === "IN_PROGRESS");

  const summaryCards = [
    {
      title: "My Tasks",
      count: myTasks.length,
      icon: User,
      color:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
      items: myTasks.slice(0, 3),
    },
    {
      title: "Overdue",
      count: overdueTasks.length,
      icon: AlertTriangle,
      color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
      items: overdueTasks.slice(0, 3),
    },
    {
      title: "In Progress",
      count: inProgressIssues.length,
      icon: Clock,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400",
      items: inProgressIssues.slice(0, 3),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
          >
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state with retry button
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-800/50 rounded-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Failed to load tasks
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">{error}</p>
            <button
              onClick={fetchTasks}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summaryCards.map((card) => (
        <div
          key={card.title}
          className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 rounded-lg overflow-hidden"
        >
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <card.icon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
              </div>
              <div className="flex items-center justify-between flex-1">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white">
                  {card.title}
                </h3>
                <span
                  className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${card.color}`}
                >
                  {card.count}
                </span>
              </div>
            </div>
          </div>
          <div className="p-4">
            {card.items.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-4">
                No {card.title.toLowerCase()}
              </p>
            ) : (
              <div className="space-y-3">
                {card.items.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <h4 className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {issue.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 capitalize mt-1">
                      {issue.type || "TASK"} • {issue.priority || "MEDIUM"} priority
                    </p>
                  </div>
                ))}
                {card.count > 3 && (
                  <button className="flex items-center justify-center w-full text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white mt-2">
                    View {card.count - 3} more{" "}
                    <ArrowRight className="w-3 h-3 ml-2" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
