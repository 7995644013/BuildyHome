import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  Settings,
  Plus,
  PieChart,
  BarChart3,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import BudgetDialog from "./BudgetDialog";
import ExpenseList from "./ExpenseList";
import BudgetPlanner from "./BudgetPlanner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const StatusBadge = ({ status }) => {
    const colors = {
        PENDING: "bg-yellow-100 text-yellow-800",
        APPROVED: "bg-green-100 text-green-800",
        REJECTED: "bg-red-100 text-red-800",
        DRAFT: "bg-gray-100 text-gray-800"
    };
    return (
        <span className={`px-2 py-1 rounded text-xs ml-2 ${colors[status] || colors.DRAFT}`}>
            {status || "DRAFT"}
        </span>
    );
};

const ProjectFinancials = ({ projectId }) => {
  const { getAccessToken, isAdmin, isProjectManager, isClient } = useAuth();
  const [financials, setFinancials] = useState(null);
  const [budget, setBudget] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [activeView, setActiveView] = useState("overview"); // overview, expenses
  // Fix #15: Add refreshing state for individual operations
  const [refreshing, setRefreshing] = useState(false);

  const canManageBudget = isAdmin || isProjectManager;
  const canViewFinancials = isAdmin || isProjectManager || isClient;

  const fetchFinancials = useCallback(async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/budget/projects/${projectId}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFinancials(data);
      } else {
        // Fix #14: Show error toast on non-OK response
        toast.error("Failed to load financial analytics");
      }
    } catch (error) {
      console.error("Error fetching financials:", error);
      // Fix #14: Show error toast on network error
      toast.error("Network error loading financials");
    }
  }, [projectId, getAccessToken]);

  const fetchBudget = useCallback(async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/budget/projects/${projectId}/budget`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBudget(data);
      } else if (response.status !== 404) {
        // Fix #14: Show error for non-404 errors (404 just means no budget yet)
        toast.error("Failed to load budget");
      }
    } catch (error) {
      console.error("Error fetching budget:", error);
      // Fix #14: Show error toast on network error
      toast.error("Network error loading budget");
    } finally {
      setLoading(false);
    }
  }, [projectId, getAccessToken]);

  const fetchTasks = useCallback(async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/tasks?projectId=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, [projectId, getAccessToken]);

  useEffect(() => {
    if (projectId) {
      fetchFinancials();
      fetchBudget();
      fetchTasks();
    }
  }, [projectId, fetchFinancials, fetchBudget, fetchTasks]);

  // Fix #15: Enhanced refresh with loading state
  const handleBudgetUpdated = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchBudget(), fetchFinancials()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExpenseUpdated = async () => {
    setRefreshing(true);
    try {
      await fetchFinancials();
    } finally {
      setRefreshing(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchBudget(), fetchFinancials()]);
      toast.success("Data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const submitForApproval = async () => {
      // ... existing code ...
  };

  const [processingApproval, setProcessingApproval] = useState(false);

  const handleApproveBudget = async (status) => {
      setProcessingApproval(true);
      try {
          const token = getAccessToken();
          // 1. Get the pending approval ID first
          const approvalRes = await fetch(`${API_BASE_URL}/budget/projects/${projectId}/budget/pending-approval`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          
          if (!approvalRes.ok) throw new Error("Could not find pending approval request");
          const approval = await approvalRes.json();
          if (!approval || !approval.id) throw new Error("No active approval request found");

          // 2. Respond to the approval
          const res = await fetch(`${API_BASE_URL}/approvals/${approval.id}/respond`, {
              method: 'PATCH',
              headers: { 
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({ status, comments: status === 'REJECTED' ? "Rejected by Admin via Project Dashboard" : "Approved by Admin" })
          });

          if (res.ok) {
              toast.success(`Budget ${status.toLowerCase()} successfully`);
              // Force refresh
              await handleBudgetUpdated();
          } else {
              const err = await res.json();
              toast.error(err.message || "Action failed");
          }
      } catch (error) {
          console.error("Approval error:", error);
          toast.error(error.message || "Failed to process approval");
      } finally {
          setProcessingApproval(false);
      }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!canViewFinancials) {
    return (
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          You don't have permission to view financial information.
        </p>
      </div>
    );
  }

  const budgetData = financials?.budget || budget;
  const totalSpent = financials?.totalSpent || 0;
  const remaining = financials?.remaining || (budgetData ? Number(budgetData.totalAmount) - totalSpent : 0);
  const currency = budgetData?.currency || "USD";
  const spentPercentage =
    budgetData && Number(budgetData.totalAmount) > 0
      ? (totalSpent / Number(budgetData.totalAmount)) * 100
      : 0;

  // Currency symbol helper
  const getCurrencySymbol = (curr) => {
    const symbols = { USD: "$", EUR: "€", GBP: "£", INR: "₹", AED: "د.إ" };
    return symbols[curr] || "$";
  };
  const currencySymbol = getCurrencySymbol(currency);

  // View Tabs
  const viewTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "expenses", label: "Expenses", icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Budget Action */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Financial Management
            {/* Fix #15: Show refreshing indicator */}
            {refreshing && (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin ml-2" />
            )}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track budget, expenses, and financial analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          </div>
        </div>

      
      {budgetData?.status && <div className="mb-4">Status: <StatusBadge status={budgetData.status} /></div>}

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-zinc-800">
        {viewTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeView === tab.id
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </div>
          </button>
        ))}
      </div>

       {/* Overview View */}
       {activeView === "overview" && (
         <div className="space-y-6">
            
            {/* Show Budget Planner for PMs if Draft or Rejected */}
            {canManageBudget && (!budgetData || ['DRAFT', 'REJECTED'].includes(budgetData.status)) && (
                <div className="mb-8">
                    {budgetData?.status === 'REJECTED' && (
                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-red-900 dark:text-red-200">Budget Rejected</h4>
                                <p className="text-sm text-red-700 dark:text-red-300">The previous budget was rejected. Please review feedback, modify, and resubmit.</p>
                            </div>
                        </div>
                    )}
                    <BudgetPlanner projectId={projectId} currentBudget={budgetData} onBudgetUpdated={handleBudgetUpdated} />
                </div>
            )}
             
            {/* Show Pending Approval Banner */}
            {budgetData?.status === 'PENDING_APPROVAL' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6">
                    <div className="text-center mb-4">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">Budget Pending Approval</h3>
                        <p className="text-amber-700 dark:text-amber-300">The budget is currently under review by the Super Admin.</p>
                    </div>
                    
                    {/* Budget Breakdown Summary for Review */}
                    {budgetData.items && budgetData.items.length > 0 && (
                         <div className="mt-4 mb-6 bg-white dark:bg-zinc-900 rounded-lg border border-amber-200 dark:border-amber-700 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                                <thead className="bg-gray-50 dark:bg-zinc-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-700">
                                    {budgetData.items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.category}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.description}</td>
                                            <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                                                {currencySymbol}{Number(item.amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50 dark:bg-zinc-800 font-semibold">
                                        <td colSpan={2} className="px-4 py-2 text-right text-sm text-gray-900 dark:text-gray-100">Total</td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-900 dark:text-gray-100">
                                            {currencySymbol}{Number(budgetData.totalAmount).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                         </div>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                        <div className="flex justify-center gap-4 border-t border-amber-200 dark:border-amber-700 pt-4">
                            <button
                                onClick={() => handleApproveBudget('APPROVED')}
                                disabled={processingApproval}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {processingApproval ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Approve Budget
                            </button>
                            <button
                                onClick={() => handleApproveBudget('REJECTED')}
                                disabled={processingApproval}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {processingApproval ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Reject Budget
                            </button>
                        </div>
                    )}
                </div>
            )}

           {/* Budget Status Alert (Only if set and not drafting) */}
           {budgetData && budgetData.totalAmount > 0 && (
             <div
               className={`p-4 rounded-lg border ${
                 spentPercentage > 100
                   ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                   : spentPercentage > 80
                   ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                   : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
               }`}
             >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle
                  className={`w-5 h-5 ${
                    spentPercentage > 100
                      ? "text-red-600 dark:text-red-400"
                      : spentPercentage > 80
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    spentPercentage > 100
                      ? "text-red-800 dark:text-red-300"
                      : spentPercentage > 80
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-emerald-800 dark:text-emerald-300"
                  }`}
                >
                  {spentPercentage > 100
                    ? "Budget Exceeded"
                    : spentPercentage > 80
                    ? "Budget Warning"
                    : "Budget On Track"}
                </span>
              </div>
              <p
                className={`text-sm ${
                  spentPercentage > 100
                    ? "text-red-700 dark:text-red-400"
                    : spentPercentage > 80
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {spentPercentage > 100
                  ? `You've exceeded the budget by ${currencySymbol}${Math.abs(remaining).toLocaleString()}`
                  : spentPercentage > 80
                  ? `${(100 - spentPercentage).toFixed(1)}% of budget remaining`
                  : `${(100 - spentPercentage).toFixed(1)}% of budget remaining`}
              </p>
            </div>
          )}

          {/* Financial Overview Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Total Budget
                </span>
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {budgetData
                  ? `${currencySymbol}${Number(budgetData.totalAmount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "Not Set"}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Amount Spent
                </span>
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {currencySymbol}{totalSpent.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div
              className={`bg-gradient-to-br rounded-lg p-6 border ${
                remaining >= 0
                  ? "from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                  : "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-medium ${
                    remaining >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  Remaining
                </span>
                {remaining >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <p
                className={`text-2xl font-bold ${
                  remaining >= 0
                    ? "text-emerald-900 dark:text-emerald-100"
                    : "text-red-900 dark:text-red-100"
                }`}
              >
                {currencySymbol}{remaining.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Utilization
                </span>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {spentPercentage.toFixed(1)}%
                </div>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900/50 h-3 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    spentPercentage > 100
                      ? "bg-red-500"
                      : spentPercentage > 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          {budgetData && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Expenses by Type */}
              {financials?.expensesByType &&
                Object.keys(financials.expensesByType).length > 0 && (
                  <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Expenses by Type
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(financials.expensesByType).map(
                        ([type, amount]) => {
                          const typePercentage =
                            (Number(amount) / totalSpent) * 100;
                          return (
                            <div key={type}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                  {type.replace("_", " ")}
                                </span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {currencySymbol}{" "}
                                  {Number(amount).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${typePercentage}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {typePercentage.toFixed(1)}% of total expenses
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

              {/* Expenses by Category */}
              {financials?.expensesByCategory &&
                Object.keys(financials.expensesByCategory).length > 0 && (
                  <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Top Categories
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(financials.expensesByCategory)
                        .sort(([, a], [, b]) => Number(b) - Number(a))
                        .slice(0, 5)
                        .map(([category, amount]) => (
                          <div
                            key={category}
                            className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-zinc-700 last:border-0"
                          >
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {category}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {currencySymbol}{" "}
                              {Number(amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* No Budget Message */}
          {!budgetData && canManageBudget && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Budget Set
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create a budget to start tracking expenses and financial performance.
              </p>
              <button
                onClick={() => setShowBudgetDialog(true)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create Budget
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expenses View - Pass currency prop */}
      {activeView === "expenses" && (
        <ExpenseList
          projectId={projectId}
          tasks={tasks}
          onExpenseUpdated={handleExpenseUpdated}
          currency={currency}
        />
      )}

      {/* Budget Dialog */}
      {showBudgetDialog && (
        <BudgetDialog
          isOpen={showBudgetDialog}
          onClose={() => setShowBudgetDialog(false)}
          projectId={projectId}
          currentBudget={budgetData}
          onBudgetUpdated={handleBudgetUpdated}
        />
      )}
    </div>
  );
};

export default ProjectFinancials;
