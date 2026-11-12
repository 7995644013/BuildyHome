import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedContent } from '../components/ProtectedContent';

const Approvals = () => {
    const { getAccessToken } = useAuth();
    const navigate = useNavigate();
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("PENDING");
    const [typeFilter, setTypeFilter] = useState("ALL");

    useEffect(() => {
        fetchApprovals();
    }, []);

    const fetchApprovals = async () => {
        setLoading(true);
        try {
            const token = getAccessToken();
             const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/approvals`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setApprovals(data);
            }
        } catch (error) {
            console.error("Failed to fetch approvals", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (approval) => {
        if (approval.type === 'BUDGET_APPROVAL') {
            navigate(`/projectsDetail?id=${approval.targetId}&tab=financials`);
        } else if (approval.type === 'TICKET_CLOSE') {
             try {
                 // Fetch ticket to get projectId
                 const token = getAccessToken();
                 const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/tickets/${approval.targetId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                 });
                 if (res.ok) {
                     const ticket = await res.json();
                     if (ticket.projectId) {
                         navigate(`/projectsDetail?id=${ticket.projectId}&tab=tickets&ticketId=${approval.targetId}`);
                     } else {
                         console.error("Ticket has no project ID");
                     }
                 }
             } catch (e) {
                 console.error("Failed to navigate to ticket", e);
             }
        } else {
             navigate(`/projectsDetail?id=${approval.targetId}`);
        }
    };

    const filteredApprovals = approvals.filter(app => {
        const statusMatch = statusFilter === "ALL" ? true : app.status === statusFilter;
        const typeMatch = typeFilter === "ALL" ? true : app.type === typeFilter;
        return statusMatch && typeMatch;
    });

    if (loading) return <div>Loading...</div>;

    return (
        <ProtectedContent allowedRoles={['super_admin', 'project_manager']}>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Approvals</h1>
                    <div className="flex gap-4">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border p-2 rounded"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                         <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="border p-2 rounded"
                        >
                            <option value="ALL">All Types</option>
                            <option value="BUDGET_APPROVAL">Budget</option>
                            <option value="TICKET_CLOSE">Ticket</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left">Type</th>
                                <th className="px-6 py-3 text-left">Requestor</th>
                                <th className="px-6 py-3 text-left">Date</th>
                                <th className="px-6 py-3 text-left">Status</th>
                                <th className="px-6 py-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApprovals.map(approval => (
                                <tr key={approval.id} className="border-b hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-medium">{approval.type.replace('_', ' ')}</td>
                                    <td className="px-6 py-4">{approval.requestedBy?.name || approval.requestedBy?.email}</td>
                                    <td className="px-6 py-4">{new Date(approval.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                            approval.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                            approval.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {approval.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleViewDetails(approval)}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredApprovals.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No approvals found matching your filters.
                        </div>
                    )}
                </div>
            </div>
        </ProtectedContent>
    );
};

export default Approvals;
