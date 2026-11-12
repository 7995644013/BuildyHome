import { useState, useEffect } from "react";
import { XIcon, Users, User, Check, Loader2, Crown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const CreateProjectDialog = ({ isDialogOpen, setIsDialogOpen, onProjectCreated }) => {
  const { getAccessToken, isAdmin, isProjectManager, currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
    assignedUsers: [],
    teamId: "",
        progress: 0,
    projectManagerId: "", // Required for admins
    clientId: "", // Optional client assignment
    });

  const [assignmentType, setAssignmentType] = useState("users"); // 'users' or 'team'
    const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users and teams when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      fetchUsers();
      fetchTeams();
      fetchClients();
    }
  }, [isDialogOpen]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const token = getAccessToken();
      // Fetch all users to get both assignable users and project managers
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Filter project managers for PM dropdown (admins need this)
        const pms = data.filter((user) => user.role === "project_manager");
        setProjectManagers(pms);
        
        // Filter assignable users (only site engineers, NOT project managers)
        const assignableUsers = data.filter(
          (user) => user.role === "site_engineer"
        );
        setAllUsers(assignableUsers);
      } else {
        toast.error("Failed to load users");
        setAllUsers([]);
        setProjectManagers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setAllUsers([]);
      setProjectManagers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users?role=client`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data || []);
      } else {
        toast.error("Failed to load clients");
        setClients([]);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
      setClients([]);
    }
  };

  const fetchTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/teams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      } else {
        toast.error("Failed to load teams");
        setTeams([]);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
      setTeams([]);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const handleUserToggle = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter((id) => id !== userId)
        : [...prev.assignedUsers, userId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        toast.error("End date must be after start date");
        return;
      }
    }

    // Validate PM selection for admins
    if (isAdmin && !formData.projectManagerId) {
      toast.error("Please select a Project Manager");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getAccessToken();
      const projectData = {
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status || "PLANNING",
        priority: formData.priority || "MEDIUM",
        // Convert dates to ISO format if provided
        startDate: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        endDate: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
        // Include clientId if selected
        ...(formData.clientId ? { clientId: formData.clientId } : {}),
        // Include projectManagerId only for admins (backend will use it)
        ...(isAdmin && formData.projectManagerId ? { projectManagerId: formData.projectManagerId } : {}),
      };

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (response.ok) {
        // If users are assigned, assign them to the project
        if (assignmentType === "users" && formData.assignedUsers.length > 0) {
          await assignUsersToProject(data.id, formData.assignedUsers);
        }

        setIsDialogOpen(false);

        // Reset form
        setFormData({
          name: "",
          description: "",
          status: "PLANNING",
          priority: "MEDIUM",
          start_date: "",
          end_date: "",
          assignedUsers: [],
          teamId: "",
          progress: 0,
          projectManagerId: "",
          clientId: "",
        });
        setAssignmentType("users");

        // Pass created project to parent for optimistic update
        if (onProjectCreated) {
          onProjectCreated(data);
        }
      } else {
        const errorData = await response.json().catch(() => data);
        toast.error(errorData.error || "Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(error?.message || "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignUsersToProject = async (projectId, userIds) => {
    try {
      const token = getAccessToken();
      for (const userId of userIds) {
        await fetch(`${API_BASE_URL}/users/assign-project`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, projectId }),
        });
      }
    } catch (error) {
      console.error("Failed to assign users to project:", error);
    }
  };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          onClick={() => setIsDialogOpen(false)}
        >
                    <XIcon className="size-5" />
                </button>

                <h2 className="text-xl font-medium mb-1">Create New Project</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Add a new project and assign team members
                    </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm mb-1">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter project name"
              className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
              required
            />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe your project"
              className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-20"
            />
                    </div>

          {/* Project Manager Selection (Only for Super Admin / Admin) */}
          {isAdmin && (
            <div>
              <label className="block text-sm mb-1 flex items-center gap-2">
                <Crown className="size-4 text-amber-500" />
                Project Manager <span className="text-red-500">*</span>
              </label>
              {isLoadingUsers ? (
                <div className="flex items-center gap-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="size-4 animate-spin" />
                  Loading project managers...
                </div>
              ) : projectManagers.length === 0 ? (
                <div className="p-3 border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    No Project Managers found. Please create a Project Manager user first.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.projectManagerId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, projectManagerId: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
                  required
                >
                  <option value="">Select a Project Manager</option>
                  {projectManagers.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name} ({pm.email})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                The selected PM will be responsible for managing this project
              </p>
            </div>
          )}

          {/* Show current user info for PM creating their own project */}
          {isProjectManager && (
            <div className="p-3 border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                <Crown className="size-4" />
                <span>You will be assigned as the Project Manager</span>
              </div>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-sm mb-1">
              Client (Optional)
            </label>
            <select
              value={formData.clientId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, clientId: e.target.value }))
              }
              className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
            >
              <option value="">No client assigned</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Assign a client to this project for tracking and collaboration
            </p>
          </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
              >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, priority: e.target.value }))
                }
                className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                }
                className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
              />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, end_date: e.target.value }))
                }
                min={
                  formData.start_date &&
                  new Date(formData.start_date).toISOString().split("T")[0]
                }
                className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
              />
                        </div>
                    </div>

          {/* Assignment Type Toggle */}
                    <div>
            <label className="block text-sm mb-2">Assign To</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAssignmentType("users")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                  assignmentType === "users"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <User className="size-4" />
                Individual Users
              </button>
              <button
                type="button"
                onClick={() => setAssignmentType("team")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                  assignmentType === "team"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <Users className="size-4" />
                Team
              </button>
                    </div>

            {/* User Selection */}
            {assignmentType === "users" && (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2">
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-blue-500" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-2">
                      Loading users...
                    </p>
                  </div>
                ) : allUsers.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                    No users available
                  </p>
                ) : (
                  allUsers.map((user) => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                        formData.assignedUsers.includes(user.id)
                          ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                          formData.assignedUsers.includes(user.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {formData.assignedUsers.includes(user.id) && (
                          <Check className="size-3 text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.assignedUsers.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="hidden"
                      />
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {user.designation}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}

            {/* Team Selection */}
            {assignmentType === "team" && (
                    <div>
                {isLoadingTeams ? (
                  <div className="flex items-center justify-center py-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <Loader2 className="size-4 animate-spin text-blue-500" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 ml-2">
                      Loading teams...
                    </p>
                  </div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <Users className="size-8 mx-auto text-zinc-400 dark:text-zinc-500 mb-2" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No teams created yet
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      Create a team first from the Team page
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.teamId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, teamId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.members?.length || 0} members)
                                    </option>
                                ))}
                        </select>
                )}
                            </div>
                        )}

            {/* Selected count */}
            {assignmentType === "users" && formData.assignedUsers.length > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                {formData.assignedUsers.length} user
                {formData.assignedUsers.length !== 1 ? "s" : ""} selected
              </p>
            )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-sm">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
                            Cancel
                        </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200 disabled:opacity-50"
            >
                            {isSubmitting ? "Creating..." : "Create Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectDialog;
