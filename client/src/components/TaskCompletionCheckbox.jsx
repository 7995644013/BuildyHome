import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Gavel,
  Camera,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { differenceInDays } from "date-fns";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Role display helper
const formatRole = (role) => {
  if (!role) return "";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const TaskCompletionCheckbox = ({ task, onStatusChange }) => {
  const { isAdmin, isProjectManager, isClient, currentUser, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);

  // Task completion status
  const userApproved = task?.userApproved || false;
  const adminApproved = task?.adminApproved || false;
  const clientApproved = task?.clientApproved || false;
  const isComplete = userApproved && adminApproved;
  const hasPhotos = task?.photos?.length > 0;

  // Check if task is in arbitration (7 days with dispute)
  const inArbitration = task?.inArbitration || task?.status === "ARBITRATION";

  // Calculate days until arbitration if in dispute
  const daysUntilArbitration = task?.disputeStartedAt
    ? 7 - differenceInDays(new Date(), new Date(task.disputeStartedAt))
    : null;

  // Check if task is in pending approval state (one approved, one not)
  const isPendingApproval =
    task?.status === "PENDING_APPROVAL" ||
    (userApproved !== adminApproved && !isComplete);

  // Is current user the assignee?
  const isAssignee = task?.assigneeId === currentUser?.id;
  
  // Is current user the project client?
  const isProjectClient = task?.project?.clientId === currentUser?.id;
  
  // Get assignee info with role
  const assigneeName = task?.assignee?.name || "Unknown";
  const assigneeRole = task?.assignee?.role || "site_engineer";
  
  // Get PM info
  const pmName = task?.project?.projectManager?.name || "Project Manager";
  
  // Get client info
  const clientName = task?.project?.client?.name || "Client";

  const handleUserApproval = async () => {
    if (isAdmin || isProjectManager || isClient) return; // Only site engineers (users) can mark as complete
    if (!isAssignee) {
      toast.error("Only the assigned user can mark this task");
      return;
    }

    // Check if photos are uploaded before marking complete
    if (!userApproved && !hasPhotos) {
      toast.error("Please upload work photographs before marking as complete");
      return;
    }

    setLoading(true);

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${task.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userApproved: !userApproved,
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        if (onStatusChange) {
          onStatusChange(updatedTask);
        }
        toast.success(
          userApproved
            ? "Task marked as incomplete"
            : "Task marked as complete. Waiting for admin approval."
        );
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update task status");
      }
    } catch {
      toast.error("Network error updating task");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminApproval = async () => {
    if (!isAdmin && !isProjectManager) return; // Only admins and project managers can approve

    setLoading(true);

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${task.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminApproved: !adminApproved,
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        if (onStatusChange) {
          onStatusChange(updatedTask);
        }
        toast.success(
          adminApproved ? "Approval removed" : "Task approved successfully"
        );
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve task");
      }
    } catch {
      toast.error("Network error approving task");
    } finally {
      setLoading(false);
    }
  };

  const handleClientApproval = async () => {
    if (!isClient && !isProjectClient) return; // Only clients can give client approval

    setLoading(true);

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${task.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientApproved: !clientApproved,
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        if (onStatusChange) {
          onStatusChange(updatedTask);
        }
        toast.success(
          clientApproved ? "Approval removed" : "Task acknowledged"
        );
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve task");
      }
    } catch {
      toast.error("Network error approving task");
    } finally {
      setLoading(false);
    }
  };

  const handleArbitrationResolve = async (resolution) => {
    if (!isAdmin) return;

    setLoading(true);

    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/tasks/${task.id}/resolve-arbitration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resolution }),
        }
      );

      if (response.ok) {
        const updatedTask = await response.json();
        if (onStatusChange) {
          onStatusChange(updatedTask);
        }
        toast.success(
          resolution === "approve"
            ? "Task approved via arbitration"
            : "Task rejected via arbitration"
        );
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to resolve arbitration");
      }
    } catch {
      toast.error("Network error resolving arbitration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Arbitration Warning */}
      {inArbitration && (
        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <Gavel className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Task in Arbitration
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              This task has been in dispute for over 7 days. Admin resolution
              required.
            </p>
            {isAdmin && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleArbitrationResolve("approve")}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Approve Task
                </button>
                <button
                  onClick={() => handleArbitrationResolve("reject")}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Reject Task
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Approval Warning */}
      {isPendingApproval && !inArbitration && daysUntilArbitration !== null && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4" />
          <span>
            {daysUntilArbitration > 0
              ? `${daysUntilArbitration} day${
                  daysUntilArbitration !== 1 ? "s" : ""
                } until arbitration`
              : "Entering arbitration soon"}
          </span>
        </div>
      )}

      {/* Photo Requirement Notice for Users */}
      {!isAdmin && !isClient && isAssignee && !hasPhotos && !userApproved && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-300">
          <Camera className="size-4" />
          <span>Upload work photographs before marking as complete</span>
        </div>
      )}

      {/* Approval Status Grid - 3 columns for SE, PM, Client */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Site Engineer (User) Approval */}
        <div
          className={`p-4 rounded-lg border ${
            userApproved
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="size-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Site Engineer
              </span>
            </div>
            {userApproved ? (
              <CheckCircle2 className="size-5 text-green-500" />
            ) : (
              <Clock className="size-5 text-gray-400" />
            )}
          </div>
          
          {/* Show assignee name with role */}
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
            {assigneeName} - {formatRole(assigneeRole)}
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {userApproved ? "Marked as complete" : "Pending completion"}
          </p>

          {/* User can toggle their approval */}
          {!isAdmin && !isClient && isAssignee && !inArbitration && (
            <button
              onClick={handleUserApproval}
              disabled={loading || (!userApproved && !hasPhotos)}
              className={`w-full py-2 px-3 text-sm rounded transition ${
                userApproved
                  ? "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600"
                  : "bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {loading
                ? "Updating..."
                : userApproved
                ? "Mark Incomplete"
                : "Mark Complete"}
            </button>
          )}

          {/* Show status for admin/PM/client */}
          {(isAdmin || isProjectManager || isClient) && (
            <div
              className={`text-xs px-2 py-1 rounded ${
                userApproved
                  ? "bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400"
                  : "bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {userApproved ? "✓ Completed" : "Waiting for completion"}
            </div>
          )}
        </div>

        {/* Project Manager Approval */}
        <div
          className={`p-4 rounded-lg border ${
            adminApproved
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="size-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Project Manager
              </span>
            </div>
            {adminApproved ? (
              <CheckCircle2 className="size-5 text-green-500" />
            ) : (
              <Clock className="size-5 text-gray-400" />
            )}
          </div>
          
          {/* Show PM name with role */}
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">
            {pmName} - Project Manager
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {adminApproved ? "Approved" : "Pending approval"}
          </p>

          {/* Admin/PM can toggle their approval - only after SE marks complete */}
          {(isAdmin || isProjectManager) && !inArbitration && (
            <button
              onClick={handleAdminApproval}
              disabled={loading || !userApproved}
              className={`w-full py-2 px-3 text-sm rounded transition ${
                !userApproved
                  ? "bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-50"
                  : adminApproved
                  ? "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {loading
                ? "Updating..."
                : !userApproved
                ? "Waiting for SE"
                : adminApproved
                ? "Remove Approval"
                : "Approve Task"}
            </button>
          )}

          {/* Show status for user/client */}
          {!isAdmin && !isProjectManager && (
            <div
              className={`text-xs px-2 py-1 rounded ${
                adminApproved
                  ? "bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400"
                  : "bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {adminApproved ? "✓ Approved" : "Waiting for approval"}
            </div>
          )}
        </div>

        {/* Client Acknowledgment */}
        <div
          className={`p-4 rounded-lg border ${
            clientApproved
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="size-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Client
              </span>
            </div>
            {clientApproved ? (
              <CheckCircle2 className="size-5 text-green-500" />
            ) : (
              <Clock className="size-5 text-gray-400" />
            )}
          </div>
          
          {/* Show client name with role */}
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
            {clientName} - Client
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {clientApproved ? "Acknowledged" : "Pending acknowledgment"}
          </p>

          {/* Client can toggle their acknowledgment */}
          {(isClient || isProjectClient) && !inArbitration && (
            <button
              onClick={handleClientApproval}
              disabled={loading}
              className={`w-full py-2 px-3 text-sm rounded transition ${
                clientApproved
                  ? "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600"
                  : "bg-purple-500 text-white hover:bg-purple-600"
              }`}
            >
              {loading
                ? "Updating..."
                : clientApproved
                ? "Remove Acknowledgment"
                : "Acknowledge"}
            </button>
          )}

          {/* Show status for non-clients */}
          {!isClient && !isProjectClient && (
            <div
              className={`text-xs px-2 py-1 rounded ${
                clientApproved
                  ? "bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400"
                  : "bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {clientApproved ? "✓ Acknowledged" : "Waiting for client"}
            </div>
          )}
        </div>
      </div>

      {/* Final Completion Status */}
      {isComplete && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle2 className="size-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Task Completed
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Both site engineer and project manager have approved this task
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCompletionCheckbox;
