import { format } from "date-fns";
import { Plus, Save, Lock, Layout, Users, MapPin, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import AddProjectMember from "./AddProjectMember";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ProjectSettings({ project, onProjectUpdate }) {
  const { isAdmin, isProjectManager, isSiteEngineer, isClient, currentUser, getUserById, getAccessToken } = useAuth();
  
  // FIX: Allow PM to edit settings if they are the assigned PM for this project
  const isAssignedPM = isProjectManager && project?.projectManagerId === currentUser?.id;
  const canEditSettings = isAdmin || isAssignedPM;
  
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "PLANNING",
    priority: "MEDIUM",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    progress: 0,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [updatingRole, setUpdatingRole] = useState(null); // Track which member's role is being updated
  const [landInfo, setLandInfo] = useState(null);
  const [landInfoLoading, setLandInfoLoading] = useState(false);
  const [landInfoForm, setLandInfoForm] = useState({
    address: "",
    areaSqft: "",
    ownershipType: "",
    legalDescription: "",
  });

  const validateForm = () => {
    const newErrors = {};
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEditSettings) return;
    
    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Project settings saved!");
        if (onProjectUpdate) {
          onProjectUpdate();
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Network error saving settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleUpdate = async (userId, newRole) => {
    if (!canEditSettings) return;
    
    const updateKey = `${userId}-${project.id}`;
    setUpdatingRole(updateKey);
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/users/${userId}/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast.success("Member role updated successfully!");
        if (onProjectUpdate) {
          onProjectUpdate();
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update role");
      }
    } catch (error) {
      toast.error("Network error updating role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const fetchLandInfo = async () => {
    if (!project?.id) return;
    
    setLandInfoLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/land-info`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLandInfo(data);
        setLandInfoForm({
          address: data.address || "",
          areaSqft: data.areaSqft?.toString() || "",
          ownershipType: data.ownershipType || "",
          legalDescription: data.legalDescription || "",
        });
      } else if (response.status !== 404) {
        // 404 is expected if land info doesn't exist yet
        toast.error("Failed to load land information");
      }
    } catch (error) {
      console.error("Error fetching land info:", error);
    } finally {
      setLandInfoLoading(false);
    }
  };

  const handleLandInfoSubmit = async (e) => {
    e.preventDefault();
    if (!canEditSettings) return;

    try {
      const token = getAccessToken();
      const payload = {
        address: landInfoForm.address.trim(),
        areaSqft: landInfoForm.areaSqft ? parseFloat(landInfoForm.areaSqft) : undefined,
        ownershipType: landInfoForm.ownershipType.trim() || undefined,
        legalDescription: landInfoForm.legalDescription.trim() || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/land-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setLandInfo(data);
        toast.success("Land information saved successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save land information");
      }
    } catch (error) {
      console.error("Error saving land info:", error);
      toast.error("Network error saving land information");
    }
  };

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "PLANNING",
        priority: project.priority || "MEDIUM",
        startDate: project.startDate || new Date().toISOString(),
        endDate: project.endDate || new Date().toISOString(),
        progress: project.progress || 0,
      });
    }
  }, [project]);

  useEffect(() => {
    if (project?.id && activeTab === 'land') {
      fetchLandInfo();
    }
  }, [project?.id, activeTab]);

  // FIX: Use assignments as fallback for members (backend returns assignments)
  const teamMembers = project?.members || project?.assignments || [];

  const inputClasses = `w-full px-3 py-2.5 rounded-lg mt-2 border text-sm transition-all duration-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
    !canEditSettings
      ? "bg-gray-50 dark:bg-zinc-800/50 cursor-not-allowed opacity-75"
      : "hover:border-zinc-400 dark:hover:border-zinc-600"
  }`;

  // Enhanced select/dropdown styling
  const selectClasses = `w-full px-3 py-2.5 rounded-lg mt-2 border text-sm transition-all duration-200 appearance-none bg-no-repeat bg-[length:16px] bg-[right_12px_center] dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
    !canEditSettings
      ? "bg-gray-50 dark:bg-zinc-800/50 cursor-not-allowed opacity-75"
      : "hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-sm"
  }`;

  // Custom chevron for select
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  };

  const cardClasses =
    "rounded-xl border p-6 not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-200 dark:border-zinc-800 shadow-sm";

  const labelClasses = "text-sm font-medium text-zinc-600 dark:text-zinc-400";

  const tabs = [
    { id: "general", label: "General & Details", icon: Layout },
    { id: "team", label: "Team Members", icon: Users },
    { id: "land", label: "Land Information", icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex p-1 bg-gray-100 dark:bg-zinc-800/50 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-1 gap-8">
        {/* Project Details Tab */}
        {activeTab === "general" && (
          <div className={cardClasses}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Project Details
              </h2>
              {!canEditSettings && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                  <Lock className="size-3" />
                  <span>Read Only</span>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-1">
                <label className={labelClasses}>Project Name</label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={inputClasses}
                  required
                  disabled={!canEditSettings}
                  readOnly={!canEditSettings}
                  placeholder="Enter project name"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className={labelClasses}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className={inputClasses + " h-24 resize-none"}
                  disabled={!canEditSettings}
                  readOnly={!canEditSettings}
                  placeholder="Describe the project..."
                />
              </div>

              {/* Status & Priority - Enhanced Dropdowns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClasses}>Status</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, status: e.target.value }))
                      }
                      className={selectClasses}
                      style={selectStyle}
                      disabled={!canEditSettings}
                    >
                      <option value="PLANNING">📋 Planning</option>
                      <option value="ACTIVE">🚀 Active</option>
                      <option value="ON_HOLD">⏸️ On Hold</option>
                      <option value="COMPLETED">✅ Completed</option>
                      <option value="CANCELLED">❌ Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>Priority</label>
                  <div className="relative">
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, priority: e.target.value }))
                      }
                      className={selectClasses}
                      style={selectStyle}
                      disabled={!canEditSettings}
                    >
                      <option value="LOW">🟢 Low</option>
                      <option value="MEDIUM">🟡 Medium</option>
                      <option value="HIGH">🔴 High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Timeline with Validation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClasses}>
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate ? format(new Date(formData.startDate), "yyyy-MM-dd") : ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        startDate: new Date(e.target.value).toISOString(),
                      })
                    }
                    className={`${inputClasses} ${errors.startDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    disabled={!canEditSettings}
                    readOnly={!canEditSettings}
                    required
                  />
                  {errors.startDate && (
                    <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate ? format(new Date(formData.endDate), "yyyy-MM-dd") : ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endDate: new Date(e.target.value).toISOString(),
                      })
                    }
                    className={`${inputClasses} ${errors.endDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    disabled={!canEditSettings}
                    readOnly={!canEditSettings}
                    required
                  />
                  {errors.endDate && (
                    <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Progress - Hybrid Input + Slider */}
              <div className="space-y-2">
                <label className={labelClasses}>Progress</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                        setFormData((prev) => ({ ...prev, progress: val }));
                      }}
                      className={`w-20 px-3 py-2 rounded-lg border text-sm text-center font-medium transition-all duration-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                        !canEditSettings ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={!canEditSettings}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={formData.progress}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, progress: Number(e.target.value) }))
                      }
                      className={`w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-blue-500 ${
                        !canEditSettings ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={!canEditSettings}
                      style={{
                        background: `linear-gradient(to right, rgb(59, 130, 246) ${formData.progress}%, rgb(228, 228, 231) ${formData.progress}%)`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              {canEditSettings && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-auto flex items-center text-sm justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  <Save className="size-4" />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              )}
            </form>
          </div>
        )}

        {/* Team Members Tab */}
        {activeTab === "team" && (
          <div className="space-y-6">
            <div className={cardClasses}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Team Members{" "}
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                    ({teamMembers.length})
                  </span>
                </h2>
                {canEditSettings && (
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200"
                  >
                    <Plus className="size-4 text-zinc-900 dark:text-zinc-300" />
                  </button>
                )}
                <AddProjectMember
                  isDialogOpen={isDialogOpen}
                  setIsDialogOpen={setIsDialogOpen}
                  projectId={project?.id}
                  onMemberAdded={onProjectUpdate}
                />
              </div>

              {/* Member List */}
              {teamMembers.length > 0 ? (
                <div className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto">
                  {teamMembers.map((member, index) => {
                    // Handle both old structure (member.user) and new structure (member.userId)
                    const user = member?.user || (member?.userId ? getUserById(member.userId) : null);
                    const userId = member?.user?.id || member?.userId;
                    const userName = user?.name || user?.email || "Unknown";
                    const userRole = user?.role || member?.role;

                    const updateKey = `${userId}-${project.id}`;
                    const isUpdating = updatingRole === updateKey;
                    const assignmentRole = member?.role || "";

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{userName}</p>
                            {userRole && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                                {userRole.replace("_", " ")}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Role Dropdown */}
                          {canEditSettings ? (
                            <div className="relative">
                              <select
                                value={assignmentRole}
                                onChange={(e) => handleRoleUpdate(userId, e.target.value)}
                                disabled={isUpdating}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 appearance-none bg-no-repeat bg-[length:12px] bg-[right_8px_center] dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer ${
                                  isUpdating ? "opacity-50 cursor-wait" : "hover:border-zinc-400 dark:hover:border-zinc-600"
                                }`}
                                style={{
                                  backgroundImage: isUpdating 
                                    ? "none"
                                    : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                  minWidth: "140px",
                                  paddingRight: isUpdating ? "12px" : "28px",
                                }}
                              >
                                <option value="">No specific role</option>
                                <option value="viewer">👁️ Viewer</option>
                                <option value="contributor">✏️ Contributor</option>
                                <option value="lead_engineer">⭐ Lead Engineer</option>
                                <option value="supervisor">👔 Supervisor</option>
                                <option value="coordinator">🔄 Coordinator</option>
                              </select>
                              {isUpdating && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                            </div>
                          ) : assignmentRole ? (
                            <span className="px-3 py-1.5 text-xs rounded-lg bg-zinc-200 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-400 capitalize">
                              {assignmentRole.replace("_", " ")}
                            </span>
                          ) : null}
                          
                          {/* Team Lead Badge */}
                          {project.team_lead === userId && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                              Team Lead
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <Plus className="size-5 text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No team members assigned yet.</p>
                  {canEditSettings && (
                    <button
                      onClick={() => setIsDialogOpen(true)}
                      className="mt-3 text-sm text-blue-500 hover:text-blue-600 font-medium"
                    >
                      Add your first team member
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Land Information Tab */}
        {activeTab === "land" && (
          <div className={cardClasses}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Land Information
              </h2>
              {!canEditSettings && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                  <Lock className="size-3" />
                  <span>Read Only</span>
                </div>
              )}
            </div>
            
            {landInfoLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleLandInfoSubmit} className="space-y-5">
                {/* Address */}
                <div className="space-y-1">
                  <label className={labelClasses}>Address <span className="text-red-500">*</span></label>
                  <input
                    value={landInfoForm.address}
                    onChange={(e) =>
                      setLandInfoForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className={inputClasses}
                    required
                    disabled={!canEditSettings}
                    readOnly={!canEditSettings}
                    placeholder="Enter property address"
                  />
                </div>

                {/* Area and Ownership Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClasses}>Area (sq ft)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={landInfoForm.areaSqft}
                      onChange={(e) =>
                        setLandInfoForm((prev) => ({ ...prev, areaSqft: e.target.value }))
                      }
                      className={inputClasses}
                      disabled={!canEditSettings}
                      readOnly={!canEditSettings}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelClasses}>Ownership Type</label>
                    <input
                      value={landInfoForm.ownershipType}
                      onChange={(e) =>
                        setLandInfoForm((prev) => ({ ...prev, ownershipType: e.target.value }))
                      }
                      className={inputClasses}
                      disabled={!canEditSettings}
                      readOnly={!canEditSettings}
                      placeholder="e.g., Freehold, Leasehold"
                    />
                  </div>
                </div>

                {/* Legal Description */}
                <div className="space-y-1">
                  <label className={labelClasses}>Legal Description</label>
                  <textarea
                    value={landInfoForm.legalDescription}
                    onChange={(e) =>
                      setLandInfoForm((prev) => ({ ...prev, legalDescription: e.target.value }))
                    }
                    className={inputClasses + " h-24 resize-none"}
                    disabled={!canEditSettings}
                    readOnly={!canEditSettings}
                    placeholder="Enter legal description or survey details..."
                  />
                </div>

                {/* Save Button */}
                {canEditSettings && (
                  <button
                    type="submit"
                    className="ml-auto flex items-center text-sm justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Save className="size-4" />
                    Save Land Information
                  </button>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
