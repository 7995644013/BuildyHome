import { Building2, FolderOpen, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const GlobalDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200 dark:border-zinc-800 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6">
            <Building2 className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Welcome, {currentUser?.name || "User"}!
          </h1>

          {/* Message */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 mb-4">
              <AlertCircle className="w-5 h-5" />
              <p className="text-lg font-medium">No Projects Assigned</p>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              You don't have any projects assigned to you yet.
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Contact your administrator or project manager to get assigned to a project.
              Once assigned, you'll be able to view project details and manage tasks.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
            >
              Back to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
            >
              Refresh
            </button>
          </div>

          {/* Info Card */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  What happens next?
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Your administrator will assign you to projects. You'll receive a notification
                  when you're assigned, and you can then access project dashboards and tasks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboard;


