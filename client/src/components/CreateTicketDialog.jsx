import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const CreateTicketDialog = ({ isOpen, onClose, projectId, onTicketCreated }) => {
    const { getAccessToken } = useAuth();
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "MEDIUM"
    });
    useEffect(() => {
        if (isOpen) {
             // Logic to run when dialog opens
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = getAccessToken();
            const res = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ...formData, projectId })
            });

            if (res.ok) {
                toast.success("Ticket created");
                onTicketCreated();
                onClose();
            } else {
                toast.error("Failed to create ticket");
            }
        } catch (error) {
            toast.error("Network error");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">New Ticket</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Title</label>
                        <input 
                            className="w-full border p-2 rounded" 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Description</label>
                        <textarea 
                            className="w-full border p-2 rounded" 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Priority</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={formData.priority}
                            onChange={e => setFormData({...formData, priority: e.target.value})}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                        </select>
                    </div>
                     {/* Auto-assigned to PM now */}
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Create Ticket</button>
                </form>
            </div>
        </div>
    );
};

export default CreateTicketDialog;
