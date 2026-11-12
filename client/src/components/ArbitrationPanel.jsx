import { useState, useEffect } from "react";
import { Gavel, AlertTriangle, CheckCircle, XCircle, Clock, User, Calendar, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { authenticatedFetch } from "../utils/api";
import { format, differenceInDays } from "date-fns";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ArbitrationPanel = () => {
  const { isAdmin, getAccessToken, selectedProjectId } = useAuth();
  const [arbitrationTasks, setArbitrationTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchArbitrationTasks();
      fetchProjects();
      fetchUsers();
    }
  }, [isAdmin, selectedProjectId]);

  const fetchArbitrationTasks = async () => {
    setIsFetching(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks?status=ARBITRATION`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setArbitrationTasks(data);
      } else {
        toast.error("Failed to load arbitration tasks");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/users/me/projects`);

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const fetchUsers = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const getUserById = (userId) => {
    return users.find((u) => u.id === userId);
  };

  if (!isAdmin) {
    return null;
  }

  const handleResolve = async (taskId, resolution) => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/resolve-arbitration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resolution }), // 'approve' or 'reject'
      });

      if (response.ok) {
        toast.success(
          resolution === "approve"
            ? "Task approved and marked as complete"
            : "Task rejected and returned to in progress"
        );
        setSelectedTask(null);
        // Refresh arbitration tasks
        fetchArbitrationTasks();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to resolve arbitration");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  if (isFetching) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (arbitrationTasks.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
            <Gavel className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Arbitration Queue
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Tasks requiring admin resolution
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <CheckCircle className="size-12 mx-auto text-green-500 mb-3" />
          <p className="text-gray-600 dark:text-zinc-400">
            No tasks in arbitration
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            All disputes have been resolved
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
            <Gavel className="size-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Arbitration Queue
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              {arbitrationTasks.length} task{arbitrationTasks.length !== 1 ? "s" : ""} requiring resolution
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-full">
          {arbitrationTasks.length} Pending
        </span>
      </div>

      {/* Task List */}
      <div className="divide-y divide-gray-200 dark:divide-zinc-800">
        {arbitrationTasks.map((task) => {
          const assignee = getUserById(task.assigneeId);
          const daysInArbitration = task.disputeStartedAt
            ? differenceInDays(new Date(), new Date(task.disputeStartedAt))
            : 0;

          return (
            <div
              key={task.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {task.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                    {getProjectName(task.projectId)}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-zinc-400">
                    {assignee && (
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {assignee.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {daysInArbitration} days in arbitration
                    </span>
                    {task.photos?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="size-3" />
                        {task.photos.length} photos
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-xs">
                    <p className={task.userApproved ? "text-green-600" : "text-gray-400"}>
                      User: {task.userApproved ? "✓" : "✗"}
                    </p>
                    <p className={task.adminApproved ? "text-green-600" : "text-gray-400"}>
                      Admin: {task.adminApproved ? "✓" : "✗"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                  <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Arbitration Review
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    Review task details and make a decision
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <XCircle className="size-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Task Info */}
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {selectedTask.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  {selectedTask.description || "No description provided"}
                </p>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-gray-500 dark:text-zinc-400">Project</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getProjectName(selectedTask.projectId)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-gray-500 dark:text-zinc-400">Assigned To</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getUserById(selectedTask.assigneeId)?.name || "Unassigned"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-gray-500 dark:text-zinc-400">Dispute Started</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTask.disputeStartedAt
                      ? format(new Date(selectedTask.disputeStartedAt), "MMM dd, yyyy")
                      : "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-gray-500 dark:text-zinc-400">Due Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTask.due_date
                      ? format(new Date(selectedTask.due_date), "MMM dd, yyyy")
                      : "No due date"}
                  </p>
                </div>
              </div>

              {/* Approval Status */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h5 className="font-medium text-amber-800 dark:text-amber-300 mb-2">
                  Approval Status
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg ${
                    selectedTask.userApproved
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  }`}>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Site Engineer</p>
                    <p className={`font-medium ${
                      selectedTask.userApproved
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    }`}>
                      {selectedTask.userApproved ? "Approved" : "Not Approved"}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    selectedTask.adminApproved
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  }`}>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Project Manager</p>
                    <p className={`font-medium ${
                      selectedTask.adminApproved
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    }`}>
                      {selectedTask.adminApproved ? "Approved" : "Not Approved"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Photos */}
              {selectedTask.photos?.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                    Uploaded Photos ({selectedTask.photos.length})
                  </h5>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTask.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-zinc-700"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(selectedTask.id, "reject")}
                disabled={loading}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Reject Task
              </button>
              <button
                onClick={() => handleResolve(selectedTask.id, "approve")}
                disabled={loading}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                Approve Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArbitrationPanel;

