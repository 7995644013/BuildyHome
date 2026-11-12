import { useState, useEffect } from "react";
import { Plus, Search, FolderOpen, Loader2, Trash2, Archive } from "lucide-react";
import ProjectCard from "../components/ProjectCard";
import CreateProjectDialog from "../components/CreateProjectDialog";
import { useAuth } from "../contexts/AuthContext";
import { authenticatedFetch } from "../utils/api";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Projects() {
  const { isAdmin, currentUser, getAccessToken, selectedProjectId } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";
  // Create is allowed for Admin and Project Manager, NOT Super Admin
  const canCreateProject = (currentUser?.role === "admin" || currentUser?.role === "project_manager");
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("active"); // "active" or "archived"
  const [filters, setFilters] = useState({
    status: "ALL",
    priority: "ALL",
  });

  // Fetch projects from API
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const includeDeleted = viewMode === "archived";
      const url = includeDeleted 
        ? `${API_BASE_URL}/projects?includeDeleted=true`
        : `${API_BASE_URL}/users/me/projects`;
      
      const response = await authenticatedFetch(url);

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else if (response.status === 401) {
        toast.error("Session expired. Please login again.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to load projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error(error?.message || "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Optimistic delete: Remove from UI immediately
  const handleDeleteProject = async (projectId) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;

    // Optimistically remove from UI
    setProjects(prev => prev.filter(p => p.id !== projectId));

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Project archived successfully");
        // Refresh to ensure consistency
        if (viewMode === "active") {
          fetchProjects();
        }
      } else {
        // Revert on error
        setProjects(prev => [...prev, projectToDelete].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ));
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to archive project");
      }
    } catch (error) {
      // Revert on error
      setProjects(prev => [...prev, projectToDelete].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ));
      console.error("Error deleting project:", error);
      toast.error(error?.message || "Network error. Please try again.");
    }
  };

  // Optimistic restore: Add back to UI immediately
  const handleRestoreProject = async (projectId) => {
    const projectToRestore = projects.find(p => p.id === projectId);
    if (!projectToRestore) return;

    // Optimistically remove from archived view
    setProjects(prev => prev.filter(p => p.id !== projectId));

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Project restored successfully");
        // Refresh to ensure consistency
        fetchProjects();
      } else {
        // Revert on error
        setProjects(prev => [...prev, projectToRestore].sort((a, b) => 
          new Date(b.deletedAt || b.createdAt) - new Date(a.deletedAt || a.createdAt)
        ));
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to restore project");
      }
    } catch (error) {
      // Revert on error
      setProjects(prev => [...prev, projectToRestore].sort((a, b) => 
        new Date(b.deletedAt || b.createdAt) - new Date(a.deletedAt || a.createdAt)
      ));
      console.error("Error restoring project:", error);
      toast.error(error?.message || "Network error. Please try again.");
    }
  };

  // Optimistic create: Add to UI immediately
  const handleProjectCreated = (newProject) => {
    // Optimistically add to UI
    setProjects(prev => [newProject, ...prev]);
    toast.success("Project created successfully");
  };

  const filterProjects = () => {
    // Filter by view mode (active vs archived)
    let filtered = projects.filter(project => {
      if (viewMode === "archived") {
        return project.isDeleted === true;
      } else {
        return !project.isDeleted;
      }
    });

        if (searchTerm) {
            filtered = filtered.filter(
                (project) =>
          project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filters.status !== "ALL") {
      filtered = filtered.filter(
        (project) => project.status === filters.status
      );
        }

        if (filters.priority !== "ALL") {
            filtered = filtered.filter(
                (project) => project.priority === filters.priority
            );
        }

    setFilteredProjects(filtered);
  };

  useEffect(() => {
    fetchProjects();
  }, [viewMode]);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, filters, viewMode]);

  const totalProjects = projects.length;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {isAdmin ? "All Projects" : "My Projects"}
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">
            {isAdmin
              ? `Manage and track all ${totalProjects} projects`
              : `You are assigned to ${totalProjects} project${totalProjects !== 1 ? "s" : ""}`}
          </p>
                </div>

                {canCreateProject && (
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 transition"
          >
                    <Plus className="size-4 mr-2" /> New Project
                </button>
                )}
        <CreateProjectDialog
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          onProjectCreated={handleProjectCreated}
        />
            </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
          </div>
        </div>
      )}

      {/* Info Banner for Regular Users */}
      {!isLoading && !isAdmin && totalProjects === 0 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>No projects assigned yet.</strong> Your admin will assign you to projects.
            Once assigned, you'll be able to view project details and manage tasks.
          </p>
        </div>
      )}

            {/* View Mode Toggle */}
            {isAdmin && (
              <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg w-fit">
                <button
                  onClick={() => setViewMode("active")}
                  className={`px-4 py-2 text-sm rounded transition ${
                    viewMode === "active"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <FolderOpen className="size-4 inline mr-2" />
                  Active Projects
                </button>
                <button
                  onClick={() => setViewMode("archived")}
                  className={`px-4 py-2 text-sm rounded transition ${
                    viewMode === "archived"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Archive className="size-4 inline mr-2" />
                  Archived
                </button>
              </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 w-4 h-4" />
          <input
            onChange={(e) => setSearchTerm(e.target.value)}
            value={searchTerm}
            className="w-full pl-10 text-sm pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:border-blue-500 outline-none"
            placeholder="Search projects..."
          />
                </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
        >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PLANNING">Planning</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
        >
                    <option value="ALL">All Priority</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                </select>
            </div>

            {/* Projects Grid */}
            {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <FolderOpen className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {searchTerm || filters.status !== "ALL" || filters.priority !== "ALL"
                ? "No matching projects"
                : isAdmin
                ? "No projects yet"
                : "No projects assigned"}
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6 text-sm">
              {searchTerm || filters.status !== "ALL" || filters.priority !== "ALL"
                ? "Try adjusting your search or filters"
                : isAdmin
                ? "Create your first project to get started"
                : "Contact your admin to get assigned to projects"}
                        </p>
            {canCreateProject && !searchTerm && filters.status === "ALL" && filters.priority === "ALL" && (
              <button
                onClick={() => setIsDialogOpen(true)}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mx-auto text-sm"
              >
                            <Plus className="size-4" />
                            Create Project
                        </button>
                        )}
                    </div>
                ) : (
                    filteredProjects.map((project) => (
                        <ProjectCard 
                          key={project.id} 
                          project={project} 
                          onDelete={isSuperAdmin && viewMode === "active" ? handleDeleteProject : undefined}
                          onRestore={isSuperAdmin && viewMode === "archived" ? handleRestoreProject : undefined}
                          isArchived={viewMode === "archived"}
                        />
                    ))
                )}
            </div>
            )}
        </div>
    );
}
