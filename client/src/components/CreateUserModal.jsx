import { useState, useEffect } from "react";
import { XIcon, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const CreateUserModal = ({ isModalOpen, setIsModalOpen, onUserCreated }) => {
  const { getAccessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "site_engineer",
    initialPassword: "",
  });

  useEffect(() => {
    if (isModalOpen) {
      fetchProjects();
    }
  }, [isModalOpen]);

  const fetchProjects = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users/me/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch {
      // Silently fail - projects are optional
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/auth/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          role: formData.role,
          initialPassword: formData.initialPassword,
          projectIds:
            selectedProjects.length > 0 ? selectedProjects : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("User created successfully");
        setIsModalOpen(false);
        // Reset form
        setFormData({
          email: "",
          name: "",
          role: "site_engineer",
          initialPassword: "",
        });
        setSelectedProjects([]);
        // Refresh user list
        if (onUserCreated) {
          onUserCreated();
        }
      } else {
        toast.error(data.error || "Failed to create user");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProjectToggle = (projectId) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          onClick={() => setIsModalOpen(false)}
        >
          <XIcon className="size-5" />
        </button>

        <h2 className="text-xl font-medium mb-1">Create New User</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Create a new user account with an initial password
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
              required
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Full name"
              className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm mb-1">Role *</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
            >
              <option value="client">Client</option>
              <option value="site_engineer">Site Engineer</option>
              <option value="project_manager">Project Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Initial Password */}
          <div>
            <label className="block text-sm mb-1">Initial Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.initialPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    initialPassword: e.target.value,
                  }))
                }
                placeholder="Minimum 8 characters"
                minLength={8}
                className="w-full px-3 py-2 pr-10 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              User will be required to change this password on first login
            </p>
          </div>

          {/* Project Assignments (Optional) */}
          {projects.length > 0 && (
            <div>
              <label className="block text-sm mb-2">
                Project Assignments (Optional)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2">
                {projects.map((project) => (
                  <label
                    key={project.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                      selectedProjects.includes(project.id)
                        ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                        selectedProjects.includes(project.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {selectedProjects.includes(project.id) && (
                        <Check className="size-3 text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => handleProjectToggle(project.id)}
                      className="hidden"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {project.referenceNumber}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {selectedProjects.length > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  {selectedProjects.length} project
                  {selectedProjects.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 text-sm">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
