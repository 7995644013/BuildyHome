import { format } from "date-fns";
import toast from "react-hot-toast";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bug,
  CalendarIcon,
  GitCommit,
  MessageSquare,
  Square,
  Trash,
  X,
  Zap,
} from "lucide-react";
import profile_img_a from "../assets/profile_img_a.svg";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ProjectTasks = ({ tasks: initialTasks, projectId, onTaskUpdate }) => {
  const {
    isAdmin,
    isProjectManager,
    isClient,
    currentUser,
    getAllUsers,
    getUserById,
    getAccessToken,
  } = useAuth();
  const [tasks, setTasks] = useState(initialTasks || []);
    const navigate = useNavigate();
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const users = await getAllUsers();
            setAllUsers(users);
        };
        fetchUsers();
    }, []);

    // Helper to get assignee info from assigneeId
    const getAssigneeInfo = (assigneeId) => {
      if (!assigneeId) return null;
      const user = allUsers.find(u => u.id === assigneeId);
      return user ? { name: user.name, image: user.avatar || profile_img_a } : null;
    };

const typeIcons = {
    BUG: { icon: Bug, color: "text-red-600 dark:text-red-400" },
    FEATURE: { icon: Zap, color: "text-blue-600 dark:text-blue-400" },
    TASK: { icon: Square, color: "text-green-600 dark:text-green-400" },
  IMPROVEMENT: {
    icon: GitCommit,
    color: "text-purple-600 dark:text-purple-400",
  },
    OTHER: { icon: MessageSquare, color: "text-amber-600 dark:text-amber-400" },
};

const priorityTexts = {
  LOW: {
    background: "bg-red-100 dark:bg-red-950",
    prioritycolor: "text-red-600 dark:text-red-400",
  },
  MEDIUM: {
    background: "bg-blue-100 dark:bg-blue-950",
    prioritycolor: "text-blue-600 dark:text-blue-400",
  },
  HIGH: {
    background: "bg-emerald-100 dark:bg-emerald-950",
    prioritycolor: "text-emerald-600 dark:text-emerald-400",
  },
};

    // Filter tasks for regular users:
    // - Admins, Project Managers, and Clients see all project tasks
    // - Other roles only see tasks assigned to them
    const canViewAllProjectTasks = isAdmin || isProjectManager || isClient;
    const filteredTasksByRole = canViewAllProjectTasks
      ? tasks
      : tasks.filter((task) => task.assigneeId === currentUser?.id);

    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        assignee: "",
    });

    const assigneeList = useMemo(
    () =>
      Array.from(new Set(tasks.map((t) => {
        const assignee = getAssigneeInfo(t.assigneeId);
        return assignee?.name;
      }).filter(Boolean))),
        [tasks, allUsers]
    );

    const filteredTasks = useMemo(() => {
        return filteredTasksByRole.filter((task) => {
            const { status, type, priority, assignee } = filters;
            const assigneeInfo = getAssigneeInfo(task.assigneeId);
            return (
                (!status || task.status === status) &&
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                (!assignee || assigneeInfo?.name === assignee)
            );
        });
    }, [filters, filteredTasksByRole, allUsers]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

  useEffect(() => {
    if (initialTasks) {
      setTasks(initialTasks);
    }
  }, [initialTasks]);

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            toast.loading("Updating status...");

            const token = getAccessToken();
            const updates = {
              status: newStatus,
            };
            
            // If status is DONE, ensure both approvals are set (for admin manual status changes)
            if (newStatus === "DONE" && isAdmin) {
                updates.userApproved = true;
                updates.adminApproved = true;
            }

            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(updates),
            });

            if (response.ok) {
              const updatedTask = await response.json();
              setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
              if (onTaskUpdate) onTaskUpdate();
              toast.dismissAll();
              toast.success("Task status updated successfully");
            } else {
              const data = await response.json();
              toast.dismissAll();
              toast.error(data.error || "Failed to update task");
            }
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.message || "Network error");
        }
    };

    const handleDelete = async () => {
        try {
      const confirm = window.confirm(
        "Are you sure you want to archive the selected tasks?"
      );
            if (!confirm) return;

            // Store tasks to restore on error
            const tasksToDelete = tasks.filter(t => selectedTasks.includes(t.id));
            
            // Optimistic update: Remove from UI immediately
            setTasks((prev) => prev.filter((t) => !selectedTasks.includes(t.id)));
            setSelectedTasks([]);
            toast.loading("Archiving tasks...");

            const token = getAccessToken();
            const deletePromises = selectedTasks.map((taskId) =>
              fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
            );

            const results = await Promise.all(deletePromises);
            const allSuccess = results.every((r) => r.ok);

            if (allSuccess) {
              toast.dismissAll();
              toast.success("Tasks archived successfully");
              if (onTaskUpdate) onTaskUpdate();
            } else {
              // Revert on error
              setTasks((prev) => [...prev, ...tasksToDelete].sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
              ));
              toast.dismissAll();
              const errorResults = await Promise.all(
                results.map(r => r.ok ? null : r.json().catch(() => ({})))
              );
              const errorMessages = errorResults.filter(Boolean).map(e => e.error).filter(Boolean);
              toast.error(errorMessages.length > 0 
                ? errorMessages[0] 
                : "Some tasks could not be archived");
            }
        } catch (error) {
            // Revert on error
            const tasksToRestore = tasks.filter(t => selectedTasks.includes(t.id));
            setTasks((prev) => [...prev, ...tasksToRestore].sort((a, b) => 
              new Date(b.createdAt) - new Date(a.createdAt)
            ));
            toast.dismissAll();
            console.error("Error deleting tasks:", error);
            toast.error(error?.message || "Network error. Please try again.");
        }
    };

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                {["status", "type", "priority", "assignee"].map((name) => {
                    const options = {
                        status: [
                            { label: "All Statuses", value: "" },
                            { label: "To Do", value: "TODO" },
                            { label: "In Progress", value: "IN_PROGRESS" },
                            { label: "Done", value: "DONE" },
                        ],
                        type: [
                            { label: "All Types", value: "" },
                            { label: "Task", value: "TASK" },
                            { label: "Bug", value: "BUG" },
                            { label: "Feature", value: "FEATURE" },
                            { label: "Improvement", value: "IMPROVEMENT" },
                            { label: "Other", value: "OTHER" },
                        ],
                        priority: [
                            { label: "All Priorities", value: "" },
                            { label: "Low", value: "LOW" },
                            { label: "Medium", value: "MEDIUM" },
                            { label: "High", value: "HIGH" },
                        ],
                        assignee: [
                            { label: "All Assignees", value: "" },
                            ...assigneeList.map((n) => ({ label: n, value: n })),
                        ],
                    };
                    return (
            <select
              key={name}
              name={name}
              onChange={handleFilterChange}
              className=" border not-dark:bg-white border-zinc-300 dark:border-zinc-800 outline-none px-3 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200"
            >
                            {options[name].map((opt, idx) => (
                <option key={idx} value={opt.value}>
                  {opt.label}
                </option>
                            ))}
                        </select>
                    );
                })}

                {/* Reset filters */}
        {(filters.status ||
          filters.type ||
          filters.priority ||
          filters.assignee) && (
          <button
            type="button"
            onClick={() =>
              setFilters({ status: "", type: "", priority: "", assignee: "" })
            }
            className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-purple-400 to-purple-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors"
          >
                        <X className="size-3" /> Reset
                    </button>
                )}

                {isAdmin && selectedTasks.length > 0 && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-indigo-400 to-indigo-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors"
          >
                        <Trash className="size-3" /> Delete
                    </button>
                )}
            </div>

            {/* Tasks Table */}
            <div className="overflow-auto rounded-lg lg:border border-zinc-300 dark:border-zinc-800">
                <div className="w-full">
                    {/* Desktop/Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm text-left not-dark:bg-white text-zinc-900 dark:text-zinc-300">
                            <thead className="text-xs uppercase dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 ">
                                <tr>
                                    {isAdmin && (
                                    <th className="pl-2 pr-1">
                      <input
                        onChange={() =>
                          selectedTasks.length > 1
                            ? setSelectedTasks([])
                            : setSelectedTasks(tasks.map((t) => t.id))
                        }
                        checked={selectedTasks.length === tasks.length}
                        type="checkbox"
                        className="size-3 accent-zinc-600 dark:accent-zinc-500"
                      />
                                    </th>
                                    )}
                                    <th className="px-4 pl-0 py-3">Title</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Assignee</th>
                                    <th className="px-4 py-3">Created By</th>
                                    <th className="px-4 py-3">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => {
                                        const { icon: Icon, color } = typeIcons[task.type] || {};
                    const { background, prioritycolor } =
                      priorityTexts[task.priority] || {};

                                        return (
                      <tr
                        key={task.id}
                        onClick={() =>
                          navigate(
                            `/taskDetails?projectId=${task.projectId}&taskId=${task.id}`
                          )
                        }
                        className=" border-t border-zinc-300 dark:border-zinc-800 group hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                      >
                                                {isAdmin && (
                          <td
                            onClick={(e) => e.stopPropagation()}
                            className="pl-2 pr-1"
                          >
                            <input
                              type="checkbox"
                              className="size-3 accent-zinc-600 dark:accent-zinc-500"
                              onChange={() =>
                                selectedTasks.includes(task.id)
                                  ? setSelectedTasks(
                                      selectedTasks.filter((i) => i !== task.id)
                                    )
                                  : setSelectedTasks((prev) => [
                                      ...prev,
                                      task.id,
                                    ])
                              }
                              checked={selectedTasks.includes(task.id)}
                            />
                                                </td>
                                                )}
                                                <td className="px-4 pl-0 py-2">{task.title}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {Icon && <Icon className={`size-4 ${color}`} />}
                            <span className={`uppercase text-xs ${color}`}>
                              {task.type}
                            </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}
                          >
                                                        {task.priority}
                                                    </span>
                                                </td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-2"
                        >
                                                    {isAdmin ? (
                            <select
                              name="status"
                              onChange={(e) =>
                                handleStatusChange(task.id, e.target.value)
                              }
                              value={task.status}
                              className="group-hover:ring ring-zinc-100 outline-none px-2 pr-4 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 cursor-pointer"
                            >
                                                        <option value="TODO">To Do</option>
                                                        <option value="IN_PROGRESS">In Progress</option>
                                                        <option value="DONE">Done</option>
                                                    </select>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                              {task.status.replace("_", " ")}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                            {task.assignee ? (
                              <>
                                <div className="size-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                                  {task.assignee.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <div>
                                  <span className="font-medium">{task.assignee.name}</span>
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1 capitalize">
                                    - {task.assignee.role?.replace(/_/g, " ") || "Assignee"}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <span className="text-zinc-400">Unassigned</span>
                            )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                            {task.createdBy ? (
                              <>
                                <div className="size-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs font-medium">
                                  {task.createdBy.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <span className="text-sm">{task.createdBy.name}</span>
                              </>
                            ) : (
                              <span className="text-zinc-400">Unknown</span>
                            )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                        <CalendarIcon className="size-4" />
                            {task.dueDate ? (
                              <span className="font-medium">{format(new Date(task.dueDate), "dd MMM yyyy")}</span>
                            ) : (
                              <span className="text-zinc-400">No due date</span>
                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                    <td
                      colSpan={isAdmin ? "8" : "7"}
                      className="text-center text-zinc-500 dark:text-zinc-400 py-6"
                    >
                                            No tasks found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Card View */}
                    <div className="lg:hidden flex flex-col gap-4">
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                                const { icon: Icon, color } = typeIcons[task.type] || {};
                const { background, prioritycolor } =
                  priorityTexts[task.priority] || {};

                                return (
                  <div
                    key={task.id}
                    className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-2"
                  >
                                        <div className="flex items-center justify-between">
                      <h3 className="text-zinc-900 dark:text-zinc-200 text-sm font-semibold">
                        {task.title}
                      </h3>
                                            {isAdmin && (
                        <input
                          type="checkbox"
                          className="size-4 accent-zinc-600 dark:accent-zinc-500"
                          onChange={() =>
                            selectedTasks.includes(task.id)
                              ? setSelectedTasks(
                                  selectedTasks.filter((i) => i !== task.id)
                                )
                              : setSelectedTasks((prev) => [...prev, task.id])
                          }
                          checked={selectedTasks.includes(task.id)}
                        />
                                            )}
                                        </div>

                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                            {Icon && <Icon className={`size-4 ${color}`} />}
                                            <span className={`${color} uppercase`}>{task.type}</span>
                                        </div>

                                        <div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}
                      >
                                                {task.priority}
                                            </span>
                                        </div>

                                        <div>
                      <label className="text-zinc-600 dark:text-zinc-400 text-xs">
                        Status
                      </label>
                                            {isAdmin ? (
                        <select
                          name="status"
                          onChange={(e) =>
                            handleStatusChange(task.id, e.target.value)
                          }
                          value={task.status}
                          className="w-full mt-1 bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700 outline-none px-2 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200"
                        >
                                                <option value="TODO">To Do</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="DONE">Done</option>
                                            </select>
                                            ) : (
                                                <div className="mt-1 px-2 py-1 rounded text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          {task.status.replace("_", " ")}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {(() => {
                        const assignee = getAssigneeInfo(task.assigneeId);
                        return assignee ? (
                          <>
                            <img
                              src={assignee.image}
                              className="size-5 rounded-full"
                              alt="avatar"
                            />
                            {assignee.name}
                          </>
                        ) : (
                          "-"
                        );
                      })()}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <CalendarIcon className="size-4" />
                      {task.dueDate ? format(new Date(task.dueDate), "dd MMMM") : "-"}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                                No tasks found for the selected filters.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTasks;
