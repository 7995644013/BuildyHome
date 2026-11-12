import { Link } from "react-router-dom";
import { Trash2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

const statusColors = {
    PLANNING: "bg-gray-200 dark:bg-zinc-600 text-gray-900 dark:text-zinc-200",
    ACTIVE: "bg-emerald-200 dark:bg-emerald-500 text-emerald-900 dark:text-emerald-900",
    ON_HOLD: "bg-amber-200 dark:bg-amber-500 text-amber-900 dark:text-amber-900",
    COMPLETED: "bg-blue-200 dark:bg-blue-500 text-blue-900 dark:text-blue-900",
    CANCELLED: "bg-red-200 dark:bg-red-500 text-red-900 dark:text-red-900",
};

const ProjectCard = ({ project, onDelete, onRestore, isArchived = false }) => {
    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to archive "${project.name}"?`)) {
            onDelete?.(project.id);
        }
    };

    const handleRestore = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onRestore?.(project.id);
    };

    const cardClasses = `bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border rounded-lg p-5 transition-all duration-200 group ${
        isArchived 
            ? "border-gray-300 dark:border-zinc-700 opacity-75 grayscale" 
            : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700"
    }`;

    return (
        <div className={cardClasses}>
            <div className="flex items-start justify-between mb-3">
                <Link 
                    to={isArchived ? "#" : `/projectsDetail?id=${project.id}&tab=tasks`} 
                    className="flex-1 min-w-0"
                    onClick={(e) => isArchived && e.preventDefault()}
                >
                    <h3 className={`font-semibold mb-1 truncate transition-colors ${
                        isArchived 
                            ? "text-gray-500 dark:text-zinc-500" 
                            : "text-gray-900 dark:text-zinc-200 group-hover:text-blue-500 dark:group-hover:text-blue-400"
                    }`}>
                        {project.name}
                        {isArchived && (
                            <span className="ml-2 px-2 py-0.5 bg-gray-300 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs rounded">
                                ARCHIVED
                            </span>
                        )}
                    </h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm line-clamp-2 mb-3">
                        {project.description || "No description"}
                    </p>
                </Link>
                {/* Action Buttons */}
                <div className="flex gap-2 ml-2">
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="Archive project"
                        >
                            <Trash2 className="size-4" />
                        </button>
                    )}
                    {onRestore && (
                        <button
                            onClick={handleRestore}
                            className="p-1.5 text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                            title="Restore project"
                        >
                            <RotateCcw className="size-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-0.5 rounded text-xs ${statusColors[project.status]}`} >
                    {project.status.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-500 dark:text-zinc-500 capitalize">
                    {project.priority} priority
                </span>
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-500">Progress</span>
                    <span className="text-gray-400 dark:text-zinc-400">{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded">
                    <div className="h-1.5 rounded bg-blue-500" style={{ width: `${project.progress || 0}%` }} />
                </div>
            </div>

        </div>
    );
};

export default ProjectCard;
