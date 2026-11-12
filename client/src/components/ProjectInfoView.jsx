import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { User, Building2, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ProjectInfoView = ({ project }) => {
  const { getAccessToken } = useAuth();
  const [projectManager, setProjectManager] = useState(null);
  const [siteEngineers, setSiteEngineers] = useState([]);

  useEffect(() => {
    if (project) {
      fetchProjectTeam();
    }
  }, [project?.id]);

  const fetchProjectTeam = async () => {
    if (!project?.id) return;
    
    try {
      const token = getAccessToken();
      
      // Fetch project details which should include projectManagerId
      const projectResponse = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        
        // Fetch project manager
        if (projectData.projectManagerId) {
          const pmResponse = await fetch(`${API_BASE_URL}/users/${projectData.projectManagerId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (pmResponse.ok) {
            const pmData = await pmResponse.json();
            setProjectManager(pmData);
          }
        }

        // Fetch assigned users (site engineers)
        // This would require a project assignments endpoint or we can get from project data
        // For now, we'll use the project data if it includes assignments
      }
    } catch (error) {
      console.error("Error fetching project team:", error);
    }
  };

  if (!project) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Project Status Card */}
      <div className="rounded-lg border p-6 bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-gray-300 dark:border-zinc-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-zinc-300 mb-4">
          Project Status
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-zinc-400">
                Progress
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {project.progress || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2 rounded">
              <div
                className="h-2 bg-blue-500 rounded"
                style={{ width: `${project.progress || 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-xs text-gray-500 dark:text-zinc-500">
                Status
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {project.status?.replace("_", " ") || "Active"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-zinc-500">
                Priority
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {project.priority || "Medium"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Information Card */}
      <div className="rounded-lg border p-6 bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-gray-300 dark:border-zinc-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-zinc-300 mb-4">
          Team Information
        </h2>
        <div className="space-y-4">
          {/* Project Manager */}
          {projectManager && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                <User className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  Project Manager
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {projectManager.name || projectManager.email}
                </p>
              </div>
            </div>
          )}

          {/* Site Engineers */}
          {siteEngineers.length > 0 && siteEngineers.map((engineer, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                <Building2 className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  Site Engineer
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {engineer.name || engineer.email}
                </p>
              </div>
            </div>
          ))}

          {/* Project Timeline */}
          {project.startDate && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-zinc-700">
              <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                <Calendar className="size-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  Start Date
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {format(new Date(project.startDate), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectInfoView;
