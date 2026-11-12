import { useState, useEffect } from "react";
import { X, Users, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const CreateTeamDialog = ({ isOpen, onClose, editTeam = null, onTeamCreated }) => {
  const { getAccessToken, isProjectManager } = useAuth();
  const [allUsers, setAllUsers] = useState([]);

  const [formData, setFormData] = useState({
    name: editTeam?.name || "",
    description: editTeam?.description || "",
    members: editTeam?.members?.map((m) => (typeof m === "string" ? m : m.userId || m.id)) || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (editTeam) {
        setFormData({
          name: editTeam.name || "",
          description: editTeam.description || "",
          members: editTeam.members?.map((m) => (typeof m === "string" ? m : m.userId || m.id)) || [],
        });
      }
    }
  }, [isOpen, editTeam]);

  const fetchUsers = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const users = await response.json();
        // PMs can only add site engineers to teams; admins can add anyone except other admins
        if (isProjectManager) {
          setAllUsers(users.filter((u) => u.role === "site_engineer"));
        } else {
          setAllUsers(users.filter((u) => u.role !== "admin" && u.role !== "super_admin"));
        }
      }
    } catch (error) {
      toast.error("Failed to load users");
    }
  };

  const handleMemberToggle = (userId) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter((id) => id !== userId)
        : [...prev.members, userId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Team name is required");
      return;
    }

    if (formData.members.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getAccessToken();
      
      if (editTeam) {
        // Update team
        const updateResponse = await fetch(`${API_BASE_URL}/teams/${editTeam.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update team");
        }

        // Update members
        const currentMembers = editTeam.members?.map((m) => (typeof m === "string" ? m : m.userId || m.id)) || [];
        const membersToAdd = formData.members.filter((id) => !currentMembers.includes(id));
        const membersToRemove = currentMembers.filter((id) => !formData.members.includes(id));

        // Add new members
        for (const userId of membersToAdd) {
          await fetch(`${API_BASE_URL}/teams/${editTeam.id}/members`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId }),
          });
        }

        // Remove members
        for (const userId of membersToRemove) {
          await fetch(`${API_BASE_URL}/teams/${editTeam.id}/members/${userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        toast.success("Team updated successfully!");
      } else {
        // Create team
        const createResponse = await fetch(`${API_BASE_URL}/teams`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create team");
        }

        const newTeam = await createResponse.json();

        // Add members
        for (const userId of formData.members) {
          await fetch(`${API_BASE_URL}/teams/${newTeam.id}/members`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId }),
          });
        }

        toast.success("Team created successfully!");
      }

      onClose();
      setFormData({ name: "", description: "", members: [] });
      if (onTeamCreated) {
        onTeamCreated();
      }
    } catch (error) {
      toast.error("Failed to save team");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
            <Users className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-medium">
              {editTeam ? "Edit Team" : "Create New Team"}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {editTeam
                ? "Update team details and members"
                : "Group members together for easier project assignment"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Name */}
          <div>
            <label className="block text-sm mb-1">Team Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Foundation Team"
              className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm mb-1">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Brief description of the team's purpose"
              className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm h-20"
            />
          </div>

          {/* Select Members */}
          <div>
            <label className="block text-sm mb-2">
              Select Team Members ({formData.members.length} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2">
              {allUsers.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                  No users available
                </p>
              ) : (
                allUsers.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                      formData.members.includes(user.id)
                        ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                        formData.members.includes(user.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {formData.members.includes(user.id) && (
                        <Check className="size-3 text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.members.includes(user.id)}
                      onChange={() => handleMemberToggle(user.id)}
                      className="hidden"
                    />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
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
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 text-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : editTeam
                ? "Update Team"
                : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamDialog;

