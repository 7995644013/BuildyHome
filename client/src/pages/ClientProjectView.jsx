import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  DollarSign, 
  Camera, 
  Calendar, 
  CheckCircle, 
  Clock,
  Loader2,
  Image as ImageIcon,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ClientProjectView = () => {
  const { currentUser, getAccessToken, selectedProjectId } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [projectSummary, setProjectSummary] = useState(null);

  useEffect(() => {
    if (!selectedProjectId) {
      // If no project selected, redirect to project selector
      navigate("/select-project");
      return;
    }
    fetchProjectSummary();
  }, [selectedProjectId]);

  const fetchProjectSummary = async () => {
    setIsLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/client/project-summary/${selectedProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjectSummary(data);
      } else {
        toast.error("Failed to load project summary");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading project overview...</p>
        </div>
      </div>
    );
  }

  if (!projectSummary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No project data available</p>
        </div>
      </div>
    );
  }

  const { project, progress, financial, recentPhotos, milestones } = projectSummary;
  const progressPercentage = progress.completionPercentage || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {project.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {project.description || "No description available"}
        </p>
        <div className="flex items-center gap-4 mt-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            project.status === "ACTIVE"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
              : project.status === "COMPLETED"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
          }`}>
            {project.status.replace("_", " ")}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Ref: {project.referenceNumber}
          </span>
        </div>
      </div>

      {/* Progress Bar - Visual Completion */}
      <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Project Progress
            </h2>
          </div>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-zinc-800 h-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{progress.completedTasks} of {progress.totalTasks} tasks completed</span>
          <span>{progress.activeTasks} tasks in progress</span>
        </div>
      </div>

      {/* Financial Overview - Read Only */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Financial Overview
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Budget</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {financial.currency} {financial.totalBudget.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Amount Spent</span>
              <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                {financial.currency} {financial.totalSpent.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Remaining</span>
                <span className={`text-xl font-bold ${
                  financial.remaining >= 0 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {financial.currency} {financial.remaining.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  financial.spentPercentage > 100
                    ? "bg-red-500"
                    : financial.spentPercentage > 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(financial.spentPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
              {financial.spentPercentage.toFixed(1)}% of budget utilized
            </p>
          </div>
        </div>

        {/* Timeline View - Milestones */}
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Upcoming Milestones
            </h2>
          </div>
          <div className="space-y-3">
            {milestones && milestones.length > 0 ? (
              milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg"
                >
                  <div className={`p-2 rounded-full ${
                    milestone.completed
                      ? "bg-emerald-100 dark:bg-emerald-500/20"
                      : "bg-blue-100 dark:bg-blue-500/20"
                  }`}>
                    {milestone.completed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {milestone.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {milestone.dueDate 
                        ? format(new Date(milestone.dueDate), "MMM d, yyyy")
                        : "No date set"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No milestones defined
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Live Feed - Recent Photo Uploads */}
      <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Photo Updates
          </h2>
        </div>
        {recentPhotos && recentPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentPhotos.map((photo, index) => (
              <div
                key={index}
                className="relative group cursor-pointer"
                onClick={() => window.open(photo.url, "_blank")}
              >
                <div className="aspect-square bg-gray-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.caption || "Task photo"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                  <p className="truncate">{photo.caption || "Task photo"}</p>
                  <p className="text-gray-300">
                    {photo.uploadedAt 
                      ? format(new Date(photo.uploadedAt), "MMM d, h:mm a")
                      : "Recently"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No photos uploaded yet
            </p>
          </div>
        )}
      </div>

      {/* Project Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 text-center">
          <BarChart3 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.totalTasks}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Tasks</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 text-center">
          <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.completedTasks}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 text-center">
          <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.activeTasks}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 text-center">
          <DollarSign className="w-6 h-6 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {financial.remaining >= 0 ? financial.remaining.toLocaleString() : "0"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Remaining Budget</p>
        </div>
      </div>
    </div>
  );
};

export default ClientProjectView;


