import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TicketDetailsPanel = ({ ticket, onClose, onUpdate }) => {
    const { getAccessToken, currentUser } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(true);
    const commentsEndRef = useRef(null);

    useEffect(() => {
        if (ticket) {
            fetchComments();
        }
    }, [ticket]);

    const fetchComments = async () => {
        try {
            setLoadingComments(true);
            const token = getAccessToken();
            const res = await fetch(`${API_BASE_URL}/tickets/${ticket.id}/comments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setComments(await res.json());
                scrollToBottom();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingComments(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const token = getAccessToken();
            const res = await fetch(`${API_BASE_URL}/tickets/${ticket.id}/comments`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ content: newComment })
            });

            if (res.ok) {
                const savedComment = await res.json();
                setComments([...comments, { ...savedComment, user: currentUser }]); // Optimistic update with current user info
                setNewComment("");
                scrollToBottom();
            } else {
                toast.error("Failed to send comment");
            }
        } catch (error) {
            toast.error("Network error");
        }
    };

    if (!ticket) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-zinc-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Ticket Details</h3>
                    <p className="text-xs text-gray-500">ID: {ticket.id.slice(0, 8)}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Details Section */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-100">{ticket.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg border border-gray-100 dark:border-zinc-700">
                        {ticket.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500 block text-xs">Status</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1
                                ${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-800' : 
                                  ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {ticket.status}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Priority</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1
                                ${ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : 
                                  ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-800'}`}>
                                {ticket.priority}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Assigned To</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {ticket.assignedTo?.name || "Unassigned"}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Created By</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {ticket.createdBy?.name || "Unknown"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-zinc-800 pt-4"></div>

                {/* Comments Section */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <MessageSquare size={16} /> Activity & Comments
                    </h4>
                    
                    {loadingComments ? (
                        <div className="flex justify-center py-4"><span className="loading loading-dots loading-sm"></span></div>
                    ) : comments.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 italic py-4">No comments yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="mt-1 flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-zinc-400 text-xs font-bold">
                                            {comment.user?.name?.[0]?.toUpperCase() || <User size={14}/>}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg rounded-tl-none flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                {comment.user?.name}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={commentsEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Comment Input */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
                <form onSubmit={handleSendComment} className="relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500 rounded-xl text-sm transition-all outline-none"
                    />
                    <button 
                        type="submit"
                        disabled={!newComment.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TicketDetailsPanel;
