import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Send, AlertCircle, DollarSign, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const BudgetPlanner = ({ projectId, currentBudget, onBudgetUpdated }) => {
    const { getAccessToken } = useAuth();
    const [items, setItems] = useState([]);
    const [currency, setCurrency] = useState('USD');
    const [loading, setLoading] = useState(false);
    
    // Initialize data
    useEffect(() => {
        if (currentBudget?.items) {
            setItems(currentBudget.items.map(i => ({
                id: i.id, // Keep ID if exists
                category: i.category,
                description: i.description,
                amount: Number(i.amount)
            })));
        } else {
             // Default starter items if new
             setItems([
                 { category: 'Materials', description: 'Initial materials', amount: 0 },
                 { category: 'Labor', description: 'Labor costs', amount: 0 }
             ]);
        }
        if (currentBudget?.currency) setCurrency(currentBudget.currency);
    }, [currentBudget]);

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { category: '', description: '', amount: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length <= 1) return; // Prevent empty list
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSaveDraft = async () => {
        // Validate
        if (items.some(i => !i.category || !i.description || i.amount <= 0)) {
            toast.error("Please fill all fields and ensure amounts are positive");
            return;
        }

        setLoading(true);
        try {
            const token = getAccessToken();
            const res = await fetch(`${API_BASE_URL}/budget/projects/${projectId}/budget/draft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    projectId,
                    currency,
                    items
                })
            });

            if (res.ok) {
                toast.success("Budget draft saved");
                onBudgetUpdated();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save draft");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
         if (!confirm("Are you sure you want to submit this budget for approval? You won't be able to edit it while pending.")) return;
        
         // First save draft to ensure backend matches UI
         await handleSaveDraft();

         // Then submit
         setLoading(true);
         try {
             const token = getAccessToken();
             const res = await fetch(`${API_BASE_URL}/budget/projects/${projectId}/budget/approval`, {
                 method: 'POST',
                 headers: { 
                     'Content-Type': 'application/json',
                     Authorization: `Bearer ${token}` 
                 },
                 body: JSON.stringify({ comments: "" }) // Send empty comments for now
             });

             if (res.ok) {
                 toast.success("Budget submitted for approval");
                 onBudgetUpdated();
             } else {
                 const errData = await res.json();
                 console.error("Submission failed:", errData);
                 toast.error(errData.message || "Failed to submit");
             }
         } catch (error) {
             toast.error("Network error");
         } finally {
             setLoading(false);
         }
    };

    return (
        <div className="bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                     <h3 className="text-lg font-semibold flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                        Budget Planner
                     </h3>
                     <p className="text-sm text-gray-500">Draft your budget by adding detailed line items.</p>
                </div>
                <div className="text-right">
                    <span className="text-sm text-gray-500 block">Total Budget</span>
                    <span className="text-2xl font-bold font-mono">
                        {currency === 'USD' ? '$' : currency} {totalAmount.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-zinc-800 text-sm text-gray-500">
                            <th className="py-3 px-2 font-medium w-1/4">Category</th>
                            <th className="py-3 px-2 font-medium w-1/2">Description</th>
                            <th className="py-3 px-2 font-medium w-32 text-right">Amount</th>
                            <th className="py-3 px-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {items.map((item, idx) => (
                            <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors border-b border-gray-100 dark:border-zinc-800 last:border-0">
                                <td className="p-2">
                                    <input 
                                        list="categories"
                                        className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 rounded px-2 py-1 outline-none transition-all"
                                        value={item.category}
                                        onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                                        placeholder="Category"
                                    />
                                    <datalist id="categories">
                                        <option value="Materials" />
                                        <option value="Labor" />
                                        <option value="Equipment" />
                                        <option value="Permits" />
                                        <option value="Services" />
                                    </datalist>
                                </td>
                                <td className="p-2">
                                    <input 
                                        className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 rounded px-2 py-1 outline-none transition-all"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                        placeholder="Item description"
                                    />
                                </td>
                                <td className="p-2">
                                    <input 
                                        type="number"
                                        className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 rounded px-2 py-1 outline-none transition-all text-right font-mono"
                                        value={item.amount}
                                        onChange={(e) => handleItemChange(idx, 'amount', Number(e.target.value))}
                                        min="0"
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <button 
                                        onClick={() => removeItem(idx)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                        title="Remove item"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button 
                    onClick={addItem}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                    <Plus size={16} /> Add Line Item
                </button>

                <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                        onClick={handleSaveDraft}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Save size={18} /> Save Draft
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-600/20"
                    >
                        <Send size={18} /> Submit Approval
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BudgetPlanner;
