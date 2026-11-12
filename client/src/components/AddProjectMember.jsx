import { useState, useEffect } from "react";
import { Mail, UserPlus, Users, Shield, HardHat, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Role display config with icons and colors
const roleConfig = {
  super_admin: { icon: Shield, label: "Super Admin", color: "text-purple-600 dark:text-purple-400" },
  admin: { icon: Shield, label: "Admin", color: "text-blue-600 dark:text-blue-400" },
  project_manager: { icon: Users, label: "Project Manager", color: "text-indigo-600 dark:text-indigo-400" },
  site_engineer: { icon: HardHat, label: "Site Engineer", color: "text-emerald-600 dark:text-emerald-400" },
  client: { icon: User, label: "Client", color: "text-gray-600 dark:text-gray-400" },
};

const AddProjectMember = ({
  isDialogOpen,
  setIsDialogOpen,
  projectId,
  onMemberAdded,
}) => {
  const { getAccessToken, isAdmin, isProjectManager, currentUser } = useAuth();
  const [project, setProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (isDialogOpen && projectId) {
      fetchProject();
      fetchUsers();
    }
  }, [isDialogOpen, projectId]);

  const fetchProject = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const projectData = await response.json();
        setProject(projectData);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
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
        const users = await response.json();
        setAllUsers(users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Get IDs of existing project members (handle both members and assignments)
  const existingMembers = project?.members || project?.assignments || [];
  const existingMemberIds = existingMembers.map((m) => m.userId || m.user?.id) || [];

  // FIX: Role-based filtering for available users
  // - Super Admin / Admin: Show all non-admin users
  // - Project Manager: Only show site_engineer and client
  const getAvailableUsers = () => {
    let filtered = allUsers.filter((user) => !existingMemberIds.includes(user.id));
    
    if (isAdmin) {
      // Admin can add anyone except other admins/super_admins
      filtered = filtered.filter((user) => 
        user.role !== "admin" && user.role !== "super_admin"
      );
    } else if (isProjectManager) {
      // PM can only add site_engineer and client
      filtered = filtered.filter((user) => 
        user.role === "site_engineer" || user.role === "client"
      );
    }
    
    return filtered;
  };

  const availableUsers = getAvailableUsers();

  // Group users by role for better organization
  const groupedUsers = availableUsers.reduce((acc, user) => {
    const role = user.role || "other";
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {});

  const [selectedUserId, setSelectedUserId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !project) return;

    setIsAdding(true);
    try {
      const token = getAccessToken();
      // Use the user assignment API endpoint
      const response = await fetch(`${API_BASE_URL}/users/assign-project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          projectId: projectId,
        }),
      });

      if (response.ok) {
        toast.success("Member added successfully!");
        setSelectedUserId("");
        setIsDialogOpen(false);
        if (onMemberAdded) {
          onMemberAdded();
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to add member");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Network error adding member");
    } finally {
      setIsAdding(false);
    }
  };

  // Get selected user details for preview
  const selectedUser = availableUsers.find(u => u.id === selectedUserId);

  if (!isDialogOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 shadow-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <UserPlus className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold">Add Team Member</h2>
          </div>
          {project && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Adding to:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-200">
                {project.name}
              </span>
            </p>
          )}
        </div>

        {/* Role restriction notice for PMs */}
        {isProjectManager && !isAdmin && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> As a Project Manager, you can only add Site Engineers and Clients to your projects.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User Selection with Enhanced Dropdown */}
          <div className="space-y-2">
            <label
              htmlFor="user"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Select Team Member
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 w-4 h-4 pointer-events-none" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="pl-10 pr-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer transition-all duration-200 hover:border-zinc-400 dark:hover:border-zinc-600"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundPosition: "right 12px center",
                  backgroundSize: "16px",
                  backgroundRepeat: "no-repeat",
                }}
                required
              >
                <option value="">Choose a team member...</option>
                {Object.entries(groupedUsers).map(([role, users]) => {
                  const config = roleConfig[role] || { label: role, color: "text-gray-600" };
                  return (
                    <optgroup key={role} label={`── ${config.label} ──`}>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} • {user.email}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            
            {/* Selected User Preview */}
            {selectedUser && (
              <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{selectedUser.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{selectedUser.email}</p>
                    <span className={`text-xs font-medium capitalize ${roleConfig[selectedUser.role]?.color || 'text-gray-500'}`}>
                      {roleConfig[selectedUser.role]?.label || selectedUser.role?.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {availableUsers.length === 0 && (
              <div className="p-4 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {isProjectManager && !isAdmin 
                    ? "No Site Engineers or Clients available to add."
                    : "All available users are already members of this project."}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="px-5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isAdding || !selectedUserId || availableUsers.length === 0
              }
              className="px-5 py-2.5 text-sm rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {isAdding ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectMember;
