import { useState, useEffect } from "react";
import { X, DollarSign, Loader2, Save } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const BudgetDialog = ({ isOpen, onClose, projectId, currentBudget, onBudgetUpdated }) => {
  const { getAccessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    totalAmount: "",
    currency: "USD",
  });

  useEffect(() => {
    if (isOpen) {
      if (currentBudget) {
        setFormData({
          totalAmount: Number(currentBudget.totalAmount).toString(),
          currency: currentBudget.currency || "USD",
        });
      } else {
        setFormData({
          totalAmount: "",
          currency: "USD",
        });
      }
    }
  }, [isOpen, currentBudget]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/budget/projects/${projectId}/budget`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            totalAmount: parseFloat(formData.totalAmount),
            currency: formData.currency,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(currentBudget ? "Budget updated successfully!" : "Budget created successfully!");
        onBudgetUpdated(data);
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to save budget");
      }
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error("Network error saving budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {currentBudget ? "Update Budget" : "Create Budget"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="AED">AED (د.إ)</option>
            </select>
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total Budget Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {formData.currency === "USD" && "$"}
                  {formData.currency === "EUR" && "€"}
                  {formData.currency === "GBP" && "£"}
                  {formData.currency === "INR" && "₹"}
                  {formData.currency === "AED" && "د.إ"}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.totalAmount}
                onChange={(e) =>
                  setFormData({ ...formData, totalAmount: e.target.value })
                }
                placeholder="0.00"
                required
                className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter the total budget allocated for this project
            </p>
          </div>

          {/* Info Box */}
          {currentBudget && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> Updating the budget will recalculate the remaining amount based on existing expenses.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {currentBudget ? "Update Budget" : "Create Budget"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetDialog;

