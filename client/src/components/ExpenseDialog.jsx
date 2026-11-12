import { useState, useEffect } from "react";
import { X, Receipt, Loader2, Save, Calendar } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { format } from "date-fns";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Fix #6 & #7: Currency symbol helper
const getCurrencySymbol = (currency) => {
  const symbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    INR: "₹",
    AED: "د.إ",
  };
  return symbols[currency] || "$";
};

const ExpenseDialog = ({
  isOpen,
  onClose,
  projectId,
  expense,
  tasks = [],
  onExpenseUpdated,
  currency = "USD",
}) => {
  const { getAccessToken, isAdmin, isProjectManager } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [adminComment, setAdminComment] = useState("");
  
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
    expenseType: "GENERAL",
    taskId: "",
    expenseDate: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    if (isOpen) {
      // Determine Read-Only Status
      if (expense) {
          if (isAdmin) {
              setIsReadOnly(true); // Super Admin cannot edit details
          } else if (isProjectManager && expense.status === 'APPROVED') {
              setIsReadOnly(true); // PM cannot edit approved expenses
          } else {
              setIsReadOnly(false);
          }

          // Fetch Approval History
          fetchApprovalHistory();

          setFormData({
            amount: Number(expense.amount).toString(),
            category: expense.category || "",
            description: expense.description || "",
            expenseType: expense.expenseType || "GENERAL",
            taskId: expense.taskId || "",
            expenseDate: expense.expenseDate
                ? format(new Date(expense.expenseDate), "yyyy-MM-dd")
                : format(new Date(), "yyyy-MM-dd"),
          });
      } else {
        setIsReadOnly(false);
        setFormData({
          amount: "",
          category: "",
          description: "",
          expenseType: "GENERAL",
          taskId: "",
          expenseDate: format(new Date(), "yyyy-MM-dd"),
        });
        setApprovalHistory([]);
        setPendingApproval(null);
      }
    }
  }, [isOpen, expense, isAdmin, isProjectManager]);

  const fetchApprovalHistory = async () => {
      try {
          const token = getAccessToken();
          const res = await fetch(`${API_BASE_URL}/approvals/history/${expense.id}`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setApprovalHistory(data);
              const pending = data.find(a => a.status === 'PENDING');
              setPendingApproval(pending || null);
          }
      } catch (err) {
          console.error("Failed to fetch history", err);
      }
  };

  const handleApprovalAction = async (status) => {
      if (!pendingApproval) return;
      if (status === 'REJECTED' && !adminComment.trim()) {
          toast.error("Please provide a reason for rejection");
          return;
      }

      setIsSubmitting(true);
      try {
          const token = getAccessToken();
          const res = await fetch(`${API_BASE_URL}/approvals/${pendingApproval.id}/respond`, {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
                   Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                  status,
                  comments: adminComment
              })
          });

          if (res.ok) {
              toast.success(`Expense ${status.toLowerCase()} successfully`);
              // Refresh parent
              onExpenseUpdated(); 
              onClose();
          } else {
              const err = await res.json();
              toast.error(err.message || "Action failed");
          }
      } catch (error) {
           toast.error("Network error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }

    if (!formData.category.trim()) {
      toast.error("Please enter a category");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAccessToken();
      const payload = {
        projectId,
        amount: parseFloat(formData.amount),
        category: formData.category.trim(),
        expenseType: formData.expenseType,
        expenseDate: new Date(formData.expenseDate).toISOString(),
        ...(formData.description.trim() && { description: formData.description.trim() }),
        ...(formData.taskId && { taskId: formData.taskId }),
      };

      const url = expense
        ? `${API_BASE_URL}/budget/expenses/${expense.id}`
        : `${API_BASE_URL}/budget/expenses`;
      const method = expense ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(expense ? "Expense updated successfully!" : "Expense created successfully!");
        onExpenseUpdated(data);
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to save expense");
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Network error saving expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(currency);

  const expenseTypeOptions = [
    { value: "GENERAL", label: "General", description: "General project expenses" },
    { value: "TASK_RELATED", label: "Task Related", description: "Expenses linked to specific tasks" },
    { value: "MATERIAL", label: "Material", description: "Material purchases and inventory" },
  ];

  const commonCategories = [
    "Materials",
    "Labor",
    "Equipment",
    "Transportation",
    "Utilities",
    "Permits",
    "Consulting",
    "Other",
    "Only Use If Necessary"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {expense ? "Expense Details" : "Add New Expense"}
                </h2>
                {expense && isReadOnly && <span className="text-xs text-gray-500">Read Only View</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Admin Approval Section */}
              {isAdmin && pendingApproval && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Admin Approval Required</h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                          Review the expense details above. You can approve or reject this request.
                      </p>
                      <textarea
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          placeholder="Add comments or rejection reason..."
                          className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-zinc-800 mb-3 text-sm"
                          rows={2}
                      />
                      <div className="flex gap-3">
                          <button
                              type="button"
                              onClick={() => handleApprovalAction('APPROVED')}
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                          >
                              Approve
                          </button>
                          <button
                              type="button"
                              onClick={() => handleApprovalAction('REJECTED')}
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                          >
                              Reject
                          </button>
                      </div>
                  </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount ({currency}) {!isReadOnly && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      disabled={isReadOnly}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0.00"
                      required={!isReadOnly}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Expense Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expense Date {!isReadOnly && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.expenseDate}
                      disabled={isReadOnly}
                      onChange={(e) =>
                        setFormData({ ...formData, expenseDate: e.target.value })
                      }
                      required={!isReadOnly}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.category}
                    disabled={isReadOnly}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Enter category"
                    list={!isReadOnly ? "categories" : undefined}
                    required={!isReadOnly}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {!isReadOnly && <datalist id="categories">
                    {commonCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>}
                </div>
              </div>

              {/* Expense Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expense Type {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {expenseTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`relative flex flex-col p-4 border-2 rounded-lg transition-all ${
                         !isReadOnly ? 'cursor-pointer' : 'cursor-default opacity-80'
                      } ${
                        formData.expenseType === option.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-zinc-700 " + (!isReadOnly ? "hover:border-gray-300 dark:hover:border-zinc-600" : "")
                      }`}
                    >
                      <input
                        type="radio"
                        name="expenseType"
                        value={option.value}
                        disabled={isReadOnly}
                        checked={formData.expenseType === option.value}
                        onChange={(e) =>
                          setFormData({ ...formData, expenseType: e.target.value })
                        }
                        className="sr-only"
                      />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {option.description}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Task Link */}
              {formData.expenseType === "TASK_RELATED" && tasks.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link to Task
                  </label>
                  <select
                    value={formData.taskId}
                    disabled={isReadOnly}
                    onChange={(e) =>
                      setFormData({ ...formData, taskId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">No task linked</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  disabled={isReadOnly}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add details..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Approval History / Activity Log */}
              {approvalHistory.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-zinc-800">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Activity Log & Comments</h4>
                      <div className="space-y-3">
                          {approvalHistory.map((item) => (
                              <div key={item.id} className="text-sm">
                                  <div className="flex justify-between items-start">
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                          item.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                          item.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                      }`}>
                                          {item.status}
                                      </span>
                                      <span className="text-gray-500 text-xs">
                                          {format(new Date(item.updatedAt), "MMM dd, HH:mm")}
                                      </span>
                                  </div>
                                  {item.comments && (
                                      <div className="mt-1 p-2 bg-gray-50 dark:bg-zinc-800 rounded text-gray-600 dark:text-gray-300 italic">
                                          "{item.comment || item.comments}"
                                      </div>
                                  )}
                                  <div className="mt-1 text-xs text-gray-400">
                                      {item.status === 'PENDING' 
                                          ? `Requested by ${item.requestedBy?.name || 'User'}`
                                          : `Processed by ${item.approvedBy?.name || 'Admin'}`}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Bottom Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                >
                  Close
                </button>
                {!isReadOnly && (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {expense ? "Update Expense" : "Add Expense"}
                        </>
                      )}
                    </button>
                )}
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDialog;
