import { format } from "date-fns";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CalendarIcon, MessageCircle, PenIcon, Loader2, ArrowLeft, Pencil, Trash2, X, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import PhotoUpload from "../components/PhotoUpload";
import TaskCompletionCheckbox from "../components/TaskCompletionCheckbox";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TaskDetails = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, isClient, getAccessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const taskId = searchParams.get("taskId");

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [taskPhotos, setTaskPhotos] = useState([]);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    if (taskId && projectId) {
      fetchTaskDetails();
      fetchComments();
    }
  }, [taskId, projectId]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    if (!projectId || !taskId) return;

    try {
      const token = getAccessToken();
      
      // Fetch task
      const taskResponse = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        setTask(taskData);
        
        // Fetch task photos
        const photosResponse = await fetch(`${API_BASE_URL}/tasks/${taskId}/photos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (photosResponse.ok) {
          const photos = await photosResponse.json();
          setTaskPhotos(photos || []);
        }
      } else {
        toast.error("Failed to load task");
        return;
      }

      // Fetch project
      const projectResponse = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData);
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
      toast.error("Network error loading task");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!taskId) return;
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const commentsData = await response.json();
        setComments(commentsData || []);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handlePhotoUpload = (photos) => {
    setTaskPhotos(photos);
  };

  const handleTaskStatusChange = async (updatedTask) => {
    try {
      // Refresh task data to get latest approval status
      await fetchTaskDetails();
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Network error updating task");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId || isPostingComment) return;

    setIsPostingComment(true);
    const commentText = newComment; // Store before clearing

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: commentText,
        }),
      });

      if (response.ok) {
        setNewComment(""); // Clear input immediately for responsiveness
        // Fetch fresh comments to ensure we have complete user data
        await fetchComments();
        toast.success("Comment added");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to add comment");
      }
    } catch (error) {
      toast.error(error?.message || "Network error");
      console.error(error);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editingContent.trim()) return;
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editingContent }),
      });

      if (response.ok) {
        setEditingCommentId(null);
        setEditingContent("");
        await fetchComments();
        toast.success("Comment updated");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update comment");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchComments();
        toast.success("Comment deleted");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete comment");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  useEffect(() => {
    if (taskId && task) {
      const interval = setInterval(() => {
        fetchComments();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [taskId, task]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-zinc-400">Loading task details...</p>
        </div>
      </div>
    );
  if (!task)
    return <div className="text-red-500 px-4 py-6">Task not found.</div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Back</span>
      </button>

      <div className="flex flex-col-reverse lg:flex-row gap-6 sm:p-4 text-gray-900 dark:text-zinc-100">
      {/* Left: Comments / Chatbox - Hidden for clients */}
      {!isClient && (
      <div className="w-full lg:w-2/3">
        <div className="p-5 rounded-md  border border-gray-300 dark:border-zinc-800  flex flex-col lg:h-[80vh]">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
            <MessageCircle className="size-5" /> Task Discussion (
            {comments.length})
          </h2>

          <div className="flex-1 md:overflow-y-scroll no-scrollbar">
            {comments.length > 0 ? (
              <div className="flex flex-col gap-4 mb-6 mr-2">
                {comments.map((comment) => {
                  // Defensive: handle missing user data
                  const userName = comment.user?.name || "Unknown User";
                  const userId = comment.user?.id;
                  const isOwnComment = userId && currentUser?.id && userId === currentUser.id;
                  const canModify = isOwnComment || isAdmin;
                  const isEditing = editingCommentId === comment.id;
                  
                  return (
                    <div
                      key={comment.id}
                      className={`sm:max-w-4/5 dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-900 border border-gray-300 dark:border-zinc-700 p-3 rounded-md ${
                        isOwnComment ? "ml-auto" : "mr-auto"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 text-sm text-gray-500 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                            {userName.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {userName}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-zinc-600">
                            •{" "}
                            {comment.createdAt
                              ? format(new Date(comment.createdAt), "dd MMM yyyy, HH:mm")
                              : "Just now"}
                          </span>
                        </div>
                        {canModify && !isEditing && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditComment(comment)}
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                              title="Edit comment"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 rounded resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={cancelEditComment}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                              <X className="size-3" /> Cancel
                            </button>
                            <button
                              onClick={() => handleEditComment(comment.id)}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                            >
                              <Check className="size-3" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900 dark:text-zinc-200">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-zinc-500 mb-4 text-sm">
                No comments yet. Be the first!
              </p>
            )}
          </div>

          {/* Add Comment */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md p-2 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-600"
              rows={3}
              disabled={isPostingComment}
            />
            <button
              onClick={handleAddComment}
              disabled={isPostingComment || !newComment.trim()}
              className="bg-gradient-to-l from-blue-500 to-blue-600 transition-colors text-white text-sm px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPostingComment ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Right: Task + Project Info */}
      <div className={`w-full ${isClient ? 'lg:w-full' : 'lg:w-1/2'} flex flex-col gap-6`}>
        {/* Task Info */}
        <div className="p-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 ">
          <div className="mb-3">
            <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
              {task.title}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-300 text-xs">
                {task.status}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300 text-xs">
                {task.type}
              </span>
              <span className="px-2 py-0.5 rounded bg-green-200 dark:bg-emerald-900 text-green-900 dark:text-emerald-300 text-xs">
                {task.priority}
              </span>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-4">
              {task.description}
            </p>
          )}

          <hr className="border-zinc-200 dark:border-zinc-700 my-3" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-zinc-300 mb-4">
            <div className="flex items-center gap-2">
              {task.assignee ? (
                <>
                  <div className="size-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-medium">
                    {task.assignee.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <span className="font-medium">{task.assignee.name}</span>
                    <span className="text-xs text-gray-500 dark:text-zinc-400 ml-1 capitalize">
                      - {task.assignee.role?.replace(/_/g, " ") || "Assignee"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="size-6 rounded-full bg-gray-300 dark:bg-zinc-600 flex items-center justify-center">
                    <span className="text-xs text-gray-500 dark:text-zinc-400">?</span>
                  </div>
                  <span className="text-gray-500 dark:text-zinc-400">No assignee</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-gray-500 dark:text-zinc-500" />
              <span>
                Due: {task.dueDate ? (
                  <span className="font-medium">{format(new Date(task.dueDate), "dd MMM yyyy")}</span>
                ) : (
                  <span className="text-gray-500 dark:text-zinc-400">No due date</span>
                )}
              </span>
            </div>
          </div>

          {/* Photo Upload Section - ReadOnly for clients (serves as viewer) */}
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <PhotoUpload
              photos={taskPhotos}
              onPhotoUpload={handlePhotoUpload}
              readOnly={isClient}
              taskId={taskId}
            />
          </div>

          {/* Task Completion Checkbox - Hidden for clients */}
          {!isClient && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <TaskCompletionCheckbox
                task={{ ...task, photos: taskPhotos }}
                onStatusChange={handleTaskStatusChange}
              />
            </div>
          )}

        </div>

        {/* Project Info */}
        {project && (
          <div className="p-4 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-800 ">
            <p className="text-xl font-medium mb-4">Project Details</p>
            <h2 className="text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              {" "}
              <PenIcon className="size-4" /> {project.name}
            </h2>
            <p className="text-xs mt-3">
              Project Start Date:{" "}
              {project.startDate ? format(new Date(project.startDate), "dd MMM yyyy") : "Not set"}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-zinc-400 mt-3">
              <span>Status: {project.status}</span>
              <span>Priority: {project.priority}</span>
              <span>Progress: {project.progress}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default TaskDetails;
