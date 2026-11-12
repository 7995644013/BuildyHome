/**
 * Global Error Handler Utility
 * Provides consistent error handling across the application
 */

/**
 * Handles API errors and displays user-friendly toast messages
 * @param {Error|Response} error - The error object or fetch Response
 * @param {string} defaultMessage - Default error message if none found
 * @returns {string} - User-friendly error message
 */
export const handleApiError = async (error, defaultMessage = "An error occurred") => {
  // If it's a Response object, try to extract error message
  if (error instanceof Response) {
    try {
      const errorData = await error.json();
      return errorData.error || errorData.message || defaultMessage;
    } catch {
      // If JSON parsing fails, use status text
      return error.statusText || defaultMessage;
    }
  }

  // If it's an Error object
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  // If it's a string
  if (typeof error === "string") {
    return error;
  }

  // Default fallback
  return defaultMessage;
};

/**
 * Wrapper for fetch that includes automatic error handling
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export const fetchWithErrorHandling = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorMessage = await handleApiError(response, "Request failed");
      throw new Error(errorMessage);
    }
    
    return response;
  } catch (error) {
    // Re-throw with user-friendly message
    throw new Error(await handleApiError(error, "Network error. Please try again."));
  }
};

/**
 * Executes an async function with error handling and toast notification
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Options for error handling
 * @param {string} options.successMessage - Message to show on success
 * @param {string} options.errorMessage - Default error message
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 */
export const executeWithErrorHandling = async (
  asyncFn,
  { successMessage, errorMessage = "An error occurred", onSuccess, onError } = {}
) => {
  try {
    const result = await asyncFn();
    if (successMessage) {
      const { default: toast } = await import("react-hot-toast");
      toast.success(successMessage);
    }
    if (onSuccess) onSuccess(result);
    return { success: true, data: result };
  } catch (error) {
    const { default: toast } = await import("react-hot-toast");
    const message = await handleApiError(error, errorMessage);
    toast.error(message);
    console.error("Error:", error);
    if (onError) onError(error);
    return { success: false, error: message };
  }
};

