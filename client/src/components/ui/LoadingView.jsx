import { Loader2 } from "lucide-react";

/**
 * LoadingView - Reusable loading state component
 * 
 * @param {string} message - Loading message to display
 * @param {string} variant - "full" | "card" | "inline"
 * @param {string} size - "sm" | "md" | "lg"
 */
const LoadingView = ({
  message = "Loading...",
  variant = "full",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const containerClasses = {
    full: "flex items-center justify-center min-h-[300px]",
    card: "bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-6",
    inline: "py-8",
  };

  return (
    <div className={containerClasses[variant]}>
      <div className="text-center">
        <Loader2
          className={`${sizeClasses[size]} text-blue-500 dark:text-blue-400 animate-spin mx-auto mb-4`}
        />
        <p className="text-gray-600 dark:text-zinc-400">{message}</p>
      </div>
    </div>
  );
};

export default LoadingView;
