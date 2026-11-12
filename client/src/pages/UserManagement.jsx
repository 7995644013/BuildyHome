import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import CreateUserModal from "../components/CreateUserModal";
import EditUserModal from "../components/EditUserModal";
import UserTableFilters from "../components/UserTableFilters";
import { Plus, Users, Loader2, Trash2, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const UserManagement = () => {
  const { getAccessToken, getAllUsers } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [allocationSort, setAllocationSort] = useState("none"); // none | asc | desc

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
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
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("User deactivated");
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to deactivate user");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleRestoreUser = async (userId) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users/${userId}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("User restored");
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to restore user");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-200 dark:bg-purple-500 text-purple-900 dark:text-purple-900";
      case "admin":
        return "bg-blue-200 dark:bg-blue-500 text-blue-900 dark:text-blue-900";
      case "project_manager":
        return "bg-indigo-200 dark:bg-indigo-500 text-indigo-900 dark:text-indigo-900";
      case "site_engineer":
        return "bg-emerald-200 dark:bg-emerald-500 text-emerald-900 dark:text-emerald-900";
      case "client":
        return "bg-gray-200 dark:bg-zinc-600 text-gray-900 dark:text-zinc-200";
      default:
        return "bg-gray-200 dark:bg-zinc-600 text-gray-900 dark:text-zinc-200";
    }
  };

  const formatRole = (role) => {
    return role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const filteredAndSortedUsers = (() => {
    const withCounts = users.map((u) => ({
      ...u,
      _projectCount: u.projectCount || u.projectAssignments?.length || 0,
    }));

    // Filter by role (grouping PMs, SEs, Clients etc.)
    const filtered =
      roleFilter === "all"
        ? withCounts
        : withCounts.filter((u) => u.role === roleFilter);

    // Sort: primarily by allocation load if requested, otherwise by role then name
    const sorted = [...filtered].sort((a, b) => {
      if (allocationSort === "asc") {
        return a._projectCount - b._projectCount;
      }
      if (allocationSort === "desc") {
        return b._projectCount - a._projectCount;
      }

      // Default grouping: by role, then name
      const roleCompare = a.role.localeCompare(b.role);
      if (roleCompare !== 0) return roleCompare;
      return (a.name || "").localeCompare(b.name || "");
    });

    return sorted;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            User Management
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">
            Manage users and their project assignments
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
        >
          <Plus size={16} /> Create User
        </button>
      </div>

      {/* Table + Filters */}
      <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <UserTableFilters
          roleFilter={roleFilter}
          allocationSort={allocationSort}
          onRoleChange={setRoleFilter}
          onAllocationChange={setAllocationSort}
        />
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Projects
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Task Completion
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
            {filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-zinc-400 text-sm">
                    No users found. Create your first user to get started.
                  </p>
                </td>
              </tr>
            ) : (
              filteredAndSortedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-zinc-400">
                          {user.email}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                            {user.projectCount || user.projectAssignments?.length || 0}{" "}
                            projects
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(
                        user.role
                      )}`}
                    >
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                    {user.projectCount || user.projectAssignments?.length || 0} assigned
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.isActive
                          ? "bg-emerald-200 dark:bg-emerald-500 text-emerald-900 dark:text-emerald-900"
                          : "bg-red-200 dark:bg-red-500 text-red-900 dark:text-red-900"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                    {typeof user.taskCompletionRate === "number"
                      ? `${user.taskCompletionRate}%`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditModalOpen(true);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                      {user.isActive ? (
                        <button
                          onClick={() => handleDeactivateUser(user.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Deactivate user"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestoreUser(user.id)}
                          className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          title="Restore user"
                        >
                          <RefreshCcw className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isModalOpen={isCreateModalOpen}
        setIsModalOpen={setIsCreateModalOpen}
        onUserCreated={fetchUsers}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isModalOpen={isEditModalOpen}
        setIsModalOpen={setIsEditModalOpen}
        user={selectedUser}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
};

export default UserManagement;

