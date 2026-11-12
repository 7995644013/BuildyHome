import { useState, useEffect } from "react";
import {
  UsersIcon,
  Search,
  UserPlus,
  Shield,
  Activity,
  Mail,
  Phone,
  Calendar,
  FolderOpen,
  CheckCircle,
  Clock,
  Users,
  Plus,
  Trash2,
  Edit2,
  Loader2,
} from "lucide-react";
import { authenticatedFetch } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import CreateTeamDialog from "../components/CreateTeamDialog";
import TeamCard from "../components/TeamCard";
import UserTableFilters from "../components/UserTableFilters";
import { format } from "date-fns";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const Team = () => {
  const { isAdmin, getAccessToken } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users"); // 'users' or 'teams'
  const [roleFilter, setRoleFilter] = useState("all");
  const [allocationSort, setAllocationSort] = useState("none"); // none | asc | desc

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, teamsRes, projectsRes, tasksRes] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/users`),
        authenticatedFetch(`${API_BASE_URL}/teams`),
        authenticatedFetch(`${API_BASE_URL}/users/me/projects`),
        authenticatedFetch(`${API_BASE_URL}/tasks`),
      ]);

      if (usersRes.ok) setAllUsers(await usersRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate user stats (uses backend projectCount rather than local projects list,
  // because /users/me/projects is scoped to the current user only).
  const getUserStats = (user) => {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    const completedTasks = userTasks.filter(
      (t) => t.userApproved && t.adminApproved
    );
    const inProgressTasks = userTasks.filter(
      (t) => t.status === "IN_PROGRESS"
    );

    return {
      totalTasks: userTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      projectCount: user.projectCount ?? 0,
    };
  };

  const filteredAndSortedUsers = (() => {
    // Attach derived stats once so we can sort by allocation load
    const withStats = allUsers.map((user) => {
      const stats = getUserStats(user);
      return {
        user,
        stats,
      };
    });

    // Text search filter
    const textFiltered = withStats.filter(({ user }) => {
      const term = searchTerm.toLowerCase();
      return (
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.designation?.toLowerCase().includes(term)
      );
    });

    // Role filter
    const roleFiltered =
      roleFilter === "all"
        ? textFiltered
        : textFiltered.filter(({ user }) => user.role === roleFilter);

    // Sort by allocation load (project count) or fallback grouping
    const sorted = [...roleFiltered].sort((a, b) => {
      const aProjects = a.stats.projectCount ?? 0;
      const bProjects = b.stats.projectCount ?? 0;

      if (allocationSort === "asc") {
        return aProjects - bProjects;
      }
      if (allocationSort === "desc") {
        return bProjects - aProjects;
      }

      // Default: group by role, then name
      const roleCompare = a.user.role.localeCompare(b.user.role);
      if (roleCompare !== 0) return roleCompare;
      return (a.user.name || "").localeCompare(b.user.name || "");
    });

    return sorted;
  })();

  const filteredTeams = teams.filter((team) =>
    team.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading team data...</p>
        </div>
      </div>
    );
  }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Team Management
          </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">
            {isAdmin
              ? "Manage team members, create teams, and assign projects"
              : "View team members and their contributions"}
                    </p>
                </div>
                {isAdmin && (
          <button
            onClick={() => setIsTeamDialogOpen(true)}
            className="flex items-center px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white transition"
          >
            <Users className="w-4 h-4 mr-2" /> Create Team
                </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
                {/* Total Members */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Total Members
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {allUsers.length}
              </p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <UsersIcon className="size-4 text-blue-500 dark:text-blue-200" />
                        </div>
                    </div>
                </div>

        {/* Teams */}
        <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between gap-8 md:gap-22">
            <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Teams</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {teams.length}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/10">
              <Users className="size-4 text-purple-500 dark:text-purple-200" />
            </div>
          </div>
        </div>

                {/* Active Projects */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Active Projects
              </p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                {
                  projects.filter(
                    (p) => p.status !== "CANCELLED" && p.status !== "COMPLETED"
                  ).length
                }
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
                            <Activity className="size-4 text-emerald-500 dark:text-emerald-200" />
                        </div>
                    </div>
                </div>

                {/* Total Tasks */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Total Tasks
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {tasks.length}
              </p>
                        </div>
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-500/10">
              <Shield className="size-4 text-amber-500 dark:text-amber-200" />
                        </div>
                    </div>
                </div>
            </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
            activeTab === "users"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
          }`}
        >
          <UsersIcon className="size-4 inline mr-2" />
          Users ({allUsers.length})
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
            activeTab === "teams"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
          }`}
        >
          <Users className="size-4 inline mr-2" />
          Teams ({teams.length})
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3" />
        <input
          placeholder={
            activeTab === "users"
              ? "Search team members..."
              : "Search teams..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 w-full text-sm rounded-md border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 py-2 focus:outline-none focus:border-blue-500"
        />
        </div>

        {/* Role & allocation filters (users tab only) */}
        {activeTab === "users" && (
          <div className="w-full sm:w-auto">
            <UserTableFilters
              roleFilter={roleFilter}
              allocationSort={allocationSort}
              onRoleChange={setRoleFilter}
              onAllocationChange={setAllocationSort}
            />
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === "users" ? (
            <div className="w-full">
                {filteredAndSortedUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No users found
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6">
                Try adjusting your search term
                        </p>
                    </div>
                ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedUsers.map(({ user, stats }) => {
                return (
                                <div
                                    key={user.id}
                    className="p-5 border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700 transition"
                                >
                    {/* User Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {user.name}
                        </h3>
                                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                          {user.designation}
                                            </p>
                                        <span
                          className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                            user.role === "super_admin"
                              ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                              : user.role === "admin"
                              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : user.role === "project_manager"
                              ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                              : user.role === "site_engineer"
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-gray-100 dark:bg-zinc-500/20 text-gray-600 dark:text-zinc-400"
                                                }`}
                                        >
                          {user.role === "super_admin"
                            ? "Super Admin"
                            : user.role === "admin"
                            ? "Admin"
                            : user.role === "project_manager"
                            ? "Project Manager"
                            : user.role === "site_engineer"
                            ? "Site Engineer"
                            : user.role === "client"
                            ? "Client"
                            : user.role?.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                        </span>
                                    </div>
                                </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                        <Mail className="size-3.5" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                          <Phone className="size-3.5" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.joinedAt && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                          <Calendar className="size-3.5" />
                          <span>
                            Joined {format(new Date(user.joinedAt), "MMM yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-zinc-400 mb-1">
                          <FolderOpen className="size-3" />
                          <span className="text-xs">Projects</span>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {stats.projectCount}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-zinc-400 mb-1">
                          <CheckCircle className="size-3" />
                          <span className="text-xs">Tasks Done</span>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {stats.completedTasks}/{stats.totalTasks}
                        </p>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full">
          {filteredTeams.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                <Users className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {teams.length === 0 ? "No teams yet" : "No teams match your search"}
              </h3>
              <p className="text-gray-500 dark:text-zinc-400 mb-6">
                {teams.length === 0
                  ? "Create teams to organize your members"
                  : "Try adjusting your search term"}
              </p>
              {isAdmin && teams.length === 0 && (
                <button
                  onClick={() => setIsTeamDialogOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition"
                >
                  <Plus className="size-4" />
                  Create First Team
                </button>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => (
                <TeamCard key={team.id} team={team} onTeamUpdated={fetchData} allProjects={projects} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Team Dialog */}
      <CreateTeamDialog
        isOpen={isTeamDialogOpen}
        onClose={() => setIsTeamDialogOpen(false)}
        onTeamCreated={fetchData}
      />
        </div>
    );
};

export default Team;
