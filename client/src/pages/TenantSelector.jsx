import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FolderOpen, Building2, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { authenticatedFetch } from "../utils/api";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TenantSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedProject } = useAuth();
  const [projects, setProjects] = useState(location.state?.projects || []);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Check if we should redirect to project details after selection (for Admin/PM)
  const redirectToDetails = location.state?.redirectToDetails || false;

  useEffect(() => {
    // If no projects passed, fetch from API
    if (projects.length === 0) {
      fetchProjects();
    }
  }, []);

  const fetchProjects = async () => {
    setIsFetching(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/users/me/projects`
      );

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        if (data.length === 0) {
          toast.error("No projects assigned. Contact your administrator.");
          setTimeout(() => navigate("/login"), 2000);
        }
      } else if (response.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
      } else {
        toast.error("Failed to load projects");
        navigate("/login");
      }
    } catch {
      toast.error("Network error. Please try again.");
      navigate("/login");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSelectProject = async (projectId) => {
    setIsLoading(true);
    setSelectedProjectId(projectId);

    // Store selected project
    setSelectedProject(projectId);

    // Small delay for visual feedback
    setTimeout(() => {
      if (redirectToDetails) {
        // Admin/PM flow: go directly to project details with tasks tab
        navigate(`/projectsDetail?id=${projectId}&tab=tasks`);
        toast.success("Project selected");
      } else {
        // Default flow: go to dashboard
        navigate("/");
        toast.success("Project selected");
      }
      setIsLoading(false);
    }, 300);
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading projects...
          </p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-zinc-800">
            <Building2 className="w-16 h-16 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Projects Assigned
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Contact your administrator to get assigned to a project.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="w-full max-w-5xl">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-zinc-800">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <FolderOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Select Project
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Choose a project to continue working
            </p>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project.id)}
                disabled={isLoading}
                className={`bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border rounded-lg p-5 transition-all duration-200 group text-left ${
                  selectedProjectId === project.id
                    ? "border-blue-500 dark:border-blue-600 ring-2 ring-blue-500 dark:ring-blue-600"
                    : "border-gray-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-600"
                } ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {/* Project Name */}
                <h3 className="font-semibold text-gray-900 dark:text-zinc-200 mb-1 truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                  {project.name}
                </h3>

                {/* Description */}
                <p className="text-gray-500 dark:text-zinc-400 text-sm line-clamp-2 mb-3">
                  {project.description || "No description"}
                </p>

                {/* Status and Reference */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      project.status === "ACTIVE"
                        ? "bg-emerald-200 dark:bg-emerald-500 text-emerald-900 dark:text-emerald-900"
                        : project.status === "PLANNING"
                        ? "bg-gray-200 dark:bg-zinc-600 text-gray-900 dark:text-zinc-200"
                        : project.status === "ON_HOLD"
                        ? "bg-amber-200 dark:bg-amber-500 text-amber-900 dark:text-amber-900"
                        : project.status === "COMPLETED"
                        ? "bg-blue-200 dark:bg-blue-500 text-blue-900 dark:text-blue-900"
                        : "bg-red-200 dark:bg-red-500 text-red-900 dark:text-red-900"
                    }`}
                  >
                    {project.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-zinc-500 font-mono">
                    {project.referenceNumber}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-500">
                      Progress
                    </span>
                    <span className="text-gray-400 dark:text-zinc-400">
                      {project.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded">
                    <div
                      className="h-1.5 rounded bg-blue-500 transition-all duration-300"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              You can switch projects anytime from the dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantSelector;
