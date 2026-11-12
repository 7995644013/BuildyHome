import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn, Mail, Lock } from "lucide-react";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const { login, setSelectedProject } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = emailRef.current?.value || "";
    const password = passwordRef.current?.value || "";

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast.success("Login successful!");

      // Check if password change required (highest priority)
      if (result.mustChangePassword) {
        navigate("/change-password", { state: { fromLogin: true } });
        setIsLoading(false);
        return;
      }

      // Get user info and projects
      const projects = result.projects || [];
      const projectCount = projects.length;
      const userRole = result.user?.role;
      const isSuperAdmin = userRole === "super_admin";
      const isAdminOrPM = userRole === "admin" || userRole === "project_manager";
      const isClient = userRole === "client";

      // NEW REDIRECT FLOW:
      // - Super Admin -> always go to dashboard (can navigate to projects tab)
      // - Admin / PM with projects -> select project -> project details
      // - Admin / PM without projects -> dashboard (can create projects)
      // - Site Engineer / Client with projects -> project selector
      // - Site Engineer / Client without projects -> empty state dashboard

      if (isSuperAdmin) {
        // Super Admin: Always go to dashboard, no project selection needed
        navigate("/");
        toast.success("Welcome! Navigate to Projects tab to manage projects.");
      } else if (projectCount > 0) {
        if (isAdminOrPM) {
          // Admin/PM: Select project then go to project details
          navigate("/select-project", { 
            state: { 
              projects,
              redirectToDetails: true // Flag to redirect to project details after selection
            } 
          });
        } else if (isClient) {
          // Client: Go to project selector for client view
          navigate("/select-project", { state: { projects } });
        } else {
          // Site Engineer: Go to project selector
          navigate("/select-project", { state: { projects } });
        }
      } else {
        // No projects
        if (isAdminOrPM) {
          // Admin/PM without projects -> Dashboard to create projects
          navigate("/");
          toast.success("Welcome! You can create projects from the dashboard.");
        } else {
          // Site Engineer / Client without projects -> Empty state
          navigate("/");
          toast("No projects assigned yet. Please contact your admin.", { icon: "ℹ️" });
        }
      }
    } else {
      toast.error(result.error || "Login failed");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-zinc-800">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Sign in to BuildyHome
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  ref={emailRef}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  ref={passwordRef}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          BuildyHome © 2025
        </p>
      </div>
    </div>
  );
};

export default Login;
