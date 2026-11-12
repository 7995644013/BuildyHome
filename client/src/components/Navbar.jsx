import { SearchIcon, PanelLeft, LogOut } from "lucide-react";
import { MoonIcon, SunIcon, Shield, User, Crown, Briefcase, HardHat, Building2 } from "lucide-react";
import profile_img_a from "../assets/profile_img_a.svg";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Navbar = ({ setIsSidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Get role badge configuration
  const getRoleBadge = (role) => {
    switch (role) {
      case "super_admin":
        return {
          label: "Super Admin",
          icon: Crown,
          bgColor: "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20",
          textColor: "text-amber-700 dark:text-amber-400",
          iconColor: "text-amber-600 dark:text-amber-400",
        };
      case "admin":
        return {
          label: "Admin",
          icon: Shield,
          bgColor: "bg-purple-100 dark:bg-purple-500/20",
          textColor: "text-purple-600 dark:text-purple-400",
          iconColor: "text-purple-600 dark:text-purple-400",
        };
      case "project_manager":
        return {
          label: "Project Manager",
          icon: Briefcase,
          bgColor: "bg-blue-100 dark:bg-blue-500/20",
          textColor: "text-blue-600 dark:text-blue-400",
          iconColor: "text-blue-600 dark:text-blue-400",
        };
      case "site_engineer":
        return {
          label: "Site Engineer",
          icon: HardHat,
          bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
          textColor: "text-emerald-600 dark:text-emerald-400",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        };
      case "client":
        return {
          label: "Client",
          icon: Building2,
          bgColor: "bg-indigo-100 dark:bg-indigo-500/20",
          textColor: "text-indigo-600 dark:text-indigo-400",
          iconColor: "text-indigo-600 dark:text-indigo-400",
        };
      default:
        return {
          label: "User",
          icon: User,
          bgColor: "bg-gray-100 dark:bg-gray-700",
          textColor: "text-gray-600 dark:text-gray-400",
          iconColor: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const roleBadge = currentUser?.role ? getRoleBadge(currentUser.role) : getRoleBadge("user");

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 xl:px-16 py-3 flex-shrink-0">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Left section */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Sidebar Trigger */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="sm:hidden p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <PanelLeft size={20} />
          </button>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              className="pl-8 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95"
          >
            {theme === "light" ? (
              <MoonIcon className="size-4 text-gray-800 dark:text-gray-200" />
            ) : (
              <SunIcon className="size-4 text-yellow-400" />
            )}
          </button>

          {/* User Info */}
          <div className="flex items-center gap-2">
            {currentUser?.role && (() => {
              const IconComponent = roleBadge.icon;
              return (
                <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-md ${roleBadge.bgColor} ${roleBadge.textColor} text-xs font-medium`}>
                  <IconComponent className={`size-3 ${roleBadge.iconColor}`} />
                  {roleBadge.label}
                </div>
              );
            })()}
            <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentUser?.name}
            </span>
            {currentUser?.name ? (
              <div className="size-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                {currentUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            ) : (
              <img
                src={profile_img_a}
                alt="User Avatar"
                className="size-7 rounded-full"
              />
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            title="Logout"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
