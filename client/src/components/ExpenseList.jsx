import { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Edit,
  Trash2,
  Search,
  Filter,
  Plus,
  Calendar,
  Tag,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import ExpenseDialog from "./ExpenseDialog";

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

const ExpenseList = ({ projectId, tasks = [], onExpenseUpdated, currency = "USD" }) => {
  const { getAccessToken, isAdmin, isProjectManager, isClient } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Fix #8: Pagination state
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const limit = 20;
  
  // Fix #13: Date filtering state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const canManageExpenses = isAdmin || isProjectManager;
  const currencySymbol = getCurrencySymbol(currency);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      
      // Build query params with pagination and date filters
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (startDate) params.set("startDate", new Date(startDate).toISOString());
      if (endDate) params.set("endDate", new Date(endDate).toISOString());
      
      const response = await fetch(
        `${API_BASE_URL}/budget/projects/${projectId}/expenses?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Handle both old format (array) and new format (object with pagination)
        if (Array.isArray(data)) {
          setExpenses(data);
          setPagination({ total: data.length, totalPages: 1 });
        } else {
          setExpenses(data.expenses || []);
          setPagination(data.pagination || { total: 0, totalPages: 1 });
        }
      } else {
        // Fix #14: Show error toast on fetch failure
        toast.error("Failed to load expenses");
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      // Fix #14: Show error toast on network failure
      toast.error("Network error loading expenses");
    } finally {
      setLoading(false);
    }
  }, [projectId, page, startDate, endDate, getAccessToken]);

  useEffect(() => {
    if (projectId) {
      fetchExpenses();
    }
  }, [projectId, fetchExpenses]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/budget/expenses/${expenseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Expense deleted successfully");
        // Optimistic update
        setExpenses(expenses.filter((e) => e.id !== expenseId));
        if (onExpenseUpdated) {
          onExpenseUpdated();
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete expense");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Network error deleting expense");
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseDialog(true);
  };

  const handleExpenseSaved = () => {
    fetchExpenses();
    if (onExpenseUpdated) {
      onExpenseUpdated();
    }
  };

  // Clear date filters
  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === "ALL" || expense.expenseType === filterType;
    return matchesSearch && matchesFilter;
  });

  const getExpenseTypeBadge = (type) => {
    const badges = {
      GENERAL: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      TASK_RELATED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      MATERIAL: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    };
    return badges[type] || badges.GENERAL;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Expenses ({pagination.total})
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage project expenses and track spending
          </p>
        </div>
        {canManageExpenses && (
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowExpenseDialog(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="ALL">All Types</option>
            <option value="GENERAL">General</option>
            <option value="TASK_RELATED">Task Related</option>
            <option value="MATERIAL">Material</option>
          </select>
        </div>

        {/* Fix #13: Date Range Filters */}
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="pl-9 pr-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <span className="text-gray-500">to</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="pl-9 pr-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={clearDateFilters}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {expenses.length === 0
              ? "No expenses recorded yet. Add your first expense to get started."
              : "No expenses match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-zinc-800">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                onClick={() => handleEditExpense(expense)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {expense.category}
                      </h4>

                      <div className="flex gap-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getExpenseTypeBadge(
                              expense.expenseType
                            )}`}
                          >
                            {expense.expenseType.replace("_", " ")}
                          </span>
                           {/* Status Badge */}
                           <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                expense.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                expense.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                           }`}>
                               {expense.status || 'PENDING'}
                           </span>
                      </div>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {expense.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                      </div>
                      {expense.taskId && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Linked to task
                        </div>
                      )}
                      {expense.createdBy && (
                        <div className="text-xs text-gray-400">
                          by {expense.createdBy.name || expense.createdBy.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {/* Fix #7: Use dynamic currency symbol */}
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {currencySymbol}{Number(expense.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    {canManageExpenses && !isAdmin && expense.status !== 'APPROVED' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit expense"
                        >
                          <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fix #8: Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} expenses
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 dark:border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="p-2 border border-gray-300 dark:border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Expense Dialog */}
      {showExpenseDialog && (
        <ExpenseDialog
          isOpen={showExpenseDialog}
          onClose={() => {
            setShowExpenseDialog(false);
            setEditingExpense(null);
          }}
          projectId={projectId}
          expense={editingExpense}
          tasks={tasks}
          onExpenseUpdated={handleExpenseSaved}
          currency={currency}
        />
      )}
    </div>
  );
};

export default ExpenseList;
