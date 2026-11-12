import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import CreateTicketDialog from "../components/CreateTicketDialog";
import TicketDetailsPanel from "../components/TicketDetailsPanel";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const Tickets = ({ projectId }) => {
    const { getAccessToken, currentUser, isProjectManager, isAdmin, isClient } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: "",
        priority: "",
    });
    const [selectedTicket, setSelectedTicket] = useState(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const ticketIdParam = searchParams.get("ticketId");

    useEffect(() => {
        if (projectId) fetchTickets();
    }, [projectId]);

    useEffect(() => {
        // Auto-open ticket if param exists and tickets are loaded
        if (ticketIdParam && tickets.length > 0) {
            const ticket = tickets.find(t => t.id === ticketIdParam);
            if (ticket) {
                setSelectedTicket(ticket);
            }
        }
    }, [ticketIdParam, tickets]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const token = getAccessToken();
            const response = await fetch(`${API_BASE_URL}/tickets?projectId=${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTickets(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tickets");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestClose = async (ticketId) => {
        if (!confirm("Are you sure you want to request closing this ticket?")) return;
        try {
            const token = getAccessToken();
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/close-request`, {
                method: 'PATCH',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comments: "Requesting closure" })
            });

            if (response.ok) {
                toast.success("Closure requested successfully");
                fetchTickets();
            } else {
                const data = await response.json();
                toast.error(data.error || "Failed to request closure");
            }
        } catch (error) {
        }
    };

    const handleForceStatus = async (ticketId, status) => {
        if (!confirm(`Are you sure you want to force ${status} this ticket?`)) return;
        try {
            const token = getAccessToken();
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                toast.success(`Ticket ${status} successfully`);
                fetchTickets();
            } else {
                const data = await response.json();
                toast.error(data.error || "Failed to update status");
            }
        } catch (error) {
            toast.error("Network error");
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        return (
            (!filters.status || ticket.status === filters.status) &&
            (!filters.priority || ticket.priority === filters.priority)
        );
    });

    const statusColors = {
        OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        PENDING_CLOSE_APPROVAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
    };

    const priorityColors = {
        LOW: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
        MEDIUM: "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
        HIGH: "bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
        CRITICAL: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
    };

    if (loading) return (
        <div className="flex justify-center p-8">
            <span className="loading loading-spinner text-primary"></span>
        </div>
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tickets</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage project issues and support tickets</p>
                </div>
                
                {/* Only Clients can create tickets */}
                {isClient && (
                <button 
                    onClick={() => setIsDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    New Ticket
                </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Filter size={18} />
                    <span className="text-sm font-medium">Filters:</span>
                </div>
                
                <select 
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="PENDING_CLOSE_APPROVAL">Pending Approval</option>
                    <option value="CLOSED">Closed</option>
                </select>

                <select 
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                </select>

                {(filters.status || filters.priority) && (
                    <button 
                        onClick={() => setFilters({ status: "", priority: "" })}
                        className="text-sm text-blue-600 hover:text-blue-500"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                        <thead className="bg-gray-50 dark:bg-zinc-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                            {filteredTickets.map((ticket) => (
                                <tr 
                                    key={ticket.id} 
                                    className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedTicket(ticket)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket.title}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{ticket.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {ticket.status.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[ticket.priority] || 'bg-gray-100 text-gray-800'}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                        {ticket.assignedTo?.name || <span className="text-gray-400 italic">Unassigned</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                        {ticket.createdBy?.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {/* Actions */}
                                        {/* Super Admin Actions - Close / Reopen */}
                                        {currentUser?.role === 'super_admin' && (
                                            <>
                                                {/* Only allow Close if PM has requested it (Pending Approval) */}
                                                {ticket.status === 'PENDING_CLOSE_APPROVAL' && (
                                                    <button
                                                        onClick={() => handleForceStatus(ticket.id, 'CLOSED')}
                                                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400 flex items-center gap-1 ml-auto"
                                                        title="Approve & Close Ticket"
                                                    >
                                                        <CheckCircle size={16} />
                                                        <span className="hidden sm:inline">Approve Closure</span>
                                                    </button>
                                                )}
                                                {ticket.status === 'CLOSED' && (
                                                    <button
                                                        onClick={() => handleForceStatus(ticket.id, 'OPEN')}
                                                        className="text-green-600 hover:text-green-900 dark:hover:text-green-400 flex items-center gap-1 ml-auto"
                                                        title="Reopen Ticket"
                                                    >
                                                        <CheckCircle size={16} />
                                                        <span className="hidden sm:inline">Reopen</span>
                                                    </button>
                                                )}
                                            </>
                                        )}

                                        {/* PM/Admin Request Close (Only if not Super Admin) */}
                                        {currentUser?.role !== 'super_admin' && (isProjectManager || isAdmin) && 
                                         ticket.status !== 'CLOSED' && 
                                         ticket.status !== 'PENDING_CLOSE_APPROVAL' && (
                                            <button 
                                                onClick={() => handleRequestClose(ticket.id)}
                                                className="text-orange-600 hover:text-orange-900 dark:hover:text-orange-400 flex items-center gap-1 ml-auto"
                                                title="Request to close ticket"
                                            >
                                                <CheckCircle size={16} />
                                                <span className="hidden sm:inline">Request Close</span>
                                            </button>
                                        )}
                                        {ticket.status === 'PENDING_CLOSE_APPROVAL' && currentUser?.role !== 'super_admin' && (
                                            <span className="text-yellow-600 dark:text-yellow-500 flex items-center gap-1 ml-auto justify-end">
                                                <Clock size={16} />
                                                <span className="hidden sm:inline">Approval Pending</span>
                                            </span>
                                        )}
                                        
                                        {/* Fallback for empty actions (e.g., Client with Open ticket) */}
                                        {((isClient && ticket.status !== 'PENDING_CLOSE_APPROVAL') || 
                                          (currentUser?.role === 'super_admin' && ticket.status === 'OPEN')) && (
                                            <span className="text-gray-400 flex justify-end">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredTickets.length === 0 && (
                        <div className="text-center py-12">
                            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No tickets found</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new ticket.</p>
                        </div>
                    )}
                </div>
            </div>

            <CreateTicketDialog 
                isOpen={isDialogOpen} 
                onClose={() => setIsDialogOpen(false)} 
                projectId={projectId}
                onTicketCreated={fetchTickets}
            />

            <TicketDetailsPanel 
                ticket={selectedTicket} 
                onClose={() => {
                    setSelectedTicket(null);
                    setSearchParams(params => {
                        params.delete("ticketId");
                        return params;
                    });
                }}
                onUpdate={fetchTickets}
            />
        </div>
    );
};

export default Tickets;
