import { useState } from "react";
import { Users, FolderOpen, Trash2, Edit2, UserMinus, Plus, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import CreateTeamDialog from "./CreateTeamDialog";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TeamCard = ({ team, onTeamUpdated, allProjects = [] }) => {
  const { isAdmin, getAccessToken } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);

  const teamProjects = team.projects || [];
  const teamMembers = team.members || [];

  const handleDelete = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/teams/${team.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Team deleted successfully");
        setShowDeleteConfirm(false);
        if (onTeamUpdated) {
          onTeamUpdated();
        }
      } else {
        toast.error("Failed to delete team");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/teams/${team.id}/members/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Member removed from team");
        if (onTeamUpdated) {
          onTeamUpdated();
        }
      } else {
        toast.error("Failed to remove member");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    }
  };

  const handleAssignProject = async (projectId) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/teams/${team.id}/projects/${projectId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Project assigned to team");
        setShowProjectSelect(false);
        if (onTeamUpdated) onTeamUpdated();
      } else {
        toast.error("Failed to assign project");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleRemoveProject = async (projectId) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/teams/${team.id}/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Project removed from team");
        if (onTeamUpdated) onTeamUpdated();
      } else {
        toast.error("Failed to remove project");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  // Get projects not yet assigned to this team
  const assignedProjectIds = teamProjects.map(pt => pt.project?.id).filter(Boolean);
  const availableProjects = allProjects.filter(p => !assignedProjectIds.includes(p.id));

  return (
    <>
      <div className="p-5 border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700 transition">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
              <Users className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {team.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {teamMembers.length} members
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditOpen(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition"
              >
                <Edit2 className="size-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        {team.description && (
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4 line-clamp-2">
            {team.description}
          </p>
        )}

        {/* Members */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">
            Team Members
          </p>
          <div className="flex flex-wrap gap-2">
            {teamMembers.length > 0 ? (
              teamMembers.slice(0, 5).map((member) => {
                const user = typeof member === "string" ? null : member.user;
                if (!user) return null;
                return (
                  <div
                    key={user.id}
                    className="group relative flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-medium">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700 dark:text-zinc-300">
                      {user.name?.split(" ")[0]}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveMember(user.id)}
                        className="hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full text-[10px] absolute -top-1 -right-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-gray-400 dark:text-zinc-500">
                No members yet
              </span>
            )}
            {teamMembers.length > 5 && (
              <div className="flex items-center justify-center w-6 h-6 bg-gray-200 dark:bg-zinc-700 rounded-full text-xs text-gray-600 dark:text-zinc-300">
                +{teamMembers.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Projects */}
        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
              <FolderOpen className="size-3.5" />
              <span className="text-xs">
                {teamProjects.length} project
                {teamProjects.length !== 1 ? "s" : ""} assigned
              </span>
            </div>
            {isAdmin && availableProjects.length > 0 && (
              <button
                onClick={() => setShowProjectSelect(!showProjectSelect)}
                className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded"
                title="Assign project"
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>
          
          {/* Project selector dropdown */}
          {showProjectSelect && (
            <div className="mb-3 p-2 bg-gray-50 dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700">
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">Select project to assign:</p>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {availableProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleAssignProject(project.id)}
                    className="text-xs px-2 py-1 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded hover:bg-blue-50 dark:hover:bg-blue-500/20 transition"
                  >
                    {project.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowProjectSelect(false)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}

          {teamProjects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {teamProjects.map((pt) => {
                const project = typeof pt === "string" ? null : pt.project;
                if (!project) return null;
                return (
                  <span
                    key={project.id}
                    className="group relative text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded"
                  >
                    {project.name}
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveProject(project.id)}
                        className="hidden group-hover:flex absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[10px]"
                        title="Remove project"
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <CreateTeamDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        editTeam={team}
        onTeamCreated={onTeamUpdated}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Team?
            </h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete "{team.name}"? This will remove
              the team but not the members or their projects.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamCard;

