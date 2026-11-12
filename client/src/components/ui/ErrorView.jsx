import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";

/**
 * ErrorView - Reusable error state component
 * 
 * @param {string} message - Error message to display
 * @param {string} description - Optional longer description
 * @param {function} onRetry - Retry callback function
 * @param {boolean} isRetrying - Whether retry is in progress
 * @param {string} variant - "card" | "inline" | "full"
 */
const ErrorView = ({
  message = "Something went wrong",
  description = "Please try again later",
  onRetry,
  isRetrying = false,
  variant = "card",
}) => {
  const baseClasses = {
    card: "bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-6",
    inline: "p-4",
    full: "flex items-center justify-center min-h-[200px]",
  };

  return (
    <div className={baseClasses[variant]}>
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {message}
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
          {description}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Try Again
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorView;
