import { useEffect, useState } from "react";
import {
  CheckSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function MyTasksSidebar() {
  const { currentUser, getAccessToken } = useAuth();
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [myTasks, setMyTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const toggleMyTasks = () => setShowMyTasks((prev) => !prev);

  const getTaskStatusColor = (status) => {
    switch (status) {
      case "DONE":
        return "bg-green-500";
      case "IN_PROGRESS":
        return "bg-yellow-500";
      case "TODO":
        return "bg-gray-500 dark:bg-zinc-500";
      default:
        return "bg-gray-400 dark:bg-zinc-400";
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchMyTasks();
  }, [currentUser?.id]);

  const fetchMyTasks = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks?assigneeId=${currentUser.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userTasks = await response.json();
        setMyTasks(userTasks || []);
      } else {
        console.error("Failed to fetch my tasks");
        setMyTasks([]);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setMyTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 px-3">
      <div
        onClick={toggleMyTasks}
        className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-2">
          <CheckSquareIcon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300">
            My Tasks
          </h3>
          <span className="bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs px-2 py-0.5 rounded">
            {myTasks.length}
          </span>
        </div>
        {showMyTasks ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
        )}
      </div>

      {showMyTasks && (
        <div className="mt-2 pl-2">
          <div className="space-y-1">
            {myTasks.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500 dark:text-zinc-500 text-center">
                No tasks assigned
              </div>
            ) : (
              myTasks.map((task, index) => (
                <Link
                  key={index}
                  to={`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`}
                  className="w-full rounded-lg transition-all duration-200 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                >
                  <div className="flex items-center gap-2 px-3 py-2 w-full min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full ${getTaskStatusColor(
                        task.status
                      )} flex-shrink-0`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 lowercase">
                        {task.status.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MyTasksSidebar;
