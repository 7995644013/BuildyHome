import { useState, useEffect } from "react";
import { FileText, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const DailyReport = ({ projectId, onReportSubmit }) => {
    const { getAccessToken } = useAuth();
    const [reports, setReports] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        workDone: "",
        issues: "",
        nextSteps: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            fetchReports();
        }
    }, [projectId]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = getAccessToken();
            const response = await fetch(`${API_BASE_URL}/reports/projects/${projectId}/reports`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setReports(data || []);
            } else {
                console.error("Failed to fetch reports");
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.workDone.trim()) {
            toast.error("Please describe the work done");
            return;
        }

        setSubmitting(true);
        toast.loading("Saving daily report...");

        try {
            const token = getAccessToken();
            const response = await fetch(`${API_BASE_URL}/reports/projects/${projectId}/reports`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    reportDate: new Date(formData.date).toISOString(),
                    workDone: formData.workDone,
                    issues: formData.issues,
                    nextSteps: formData.nextSteps,
                }),
            });

            if (response.ok) {
                const newReport = await response.json();
                
                setReports((prev) => [newReport, ...prev]);
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    workDone: "",
                    issues: "",
                    nextSteps: "",
                });
                setShowForm(false);

                toast.dismissAll();
                toast.success("Daily report saved successfully");

                if (onReportSubmit) {
                    onReportSubmit(newReport);
                }
            } else {
                const data = await response.json();
                throw new Error(data.error || "Failed to save report");
            }
        } catch (error) {
            toast.dismissAll();
            toast.error(error.message || "Failed to save report");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="size-4 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Daily Reports
                    </h3>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    <Plus className="size-3" />
                    New Report
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="p-4 border border-gray-300 dark:border-zinc-700 rounded-lg space-y-3">
                    <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Work Done
                        </label>
                        <textarea
                            value={formData.workDone}
                            onChange={(e) => setFormData((prev) => ({ ...prev, workDone: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 text-gray-900 dark:text-white h-20"
                            placeholder="Describe the work completed today"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Issues (Optional)
                        </label>
                        <textarea
                            value={formData.issues}
                            onChange={(e) => setFormData((prev) => ({ ...prev, issues: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 text-gray-900 dark:text-white h-16"
                            placeholder="Any issues or challenges faced"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Next Steps (Optional)
                        </label>
                        <textarea
                            value={formData.nextSteps}
                            onChange={(e) => setFormData((prev) => ({ ...prev, nextSteps: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 text-gray-900 dark:text-white h-16"
                            placeholder="Planned work for next day"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {submitting ? "Saving..." : "Save Report"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 text-xs border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-center py-4 text-xs text-gray-500">Loading reports...</div>
            ) : reports.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className="p-3 border border-gray-300 dark:border-zinc-700 rounded-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {format(new Date(report.reportDate || report.date), "MMM dd, yyyy")}
                                </span>
                                {report.createdBy && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        by {report.createdBy.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                                {report.workDone}
                            </p>
                            {report.issues && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Issues: {report.issues}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 text-xs text-gray-500 italic">
                    No daily reports yet
                </div>
            )}
        </div>
    );
};

export default DailyReport;



























