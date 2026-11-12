import { useState, useEffect } from "react";
import { Package, Plus, Pencil, Trash2, X, AlertCircle, Save, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const MaterialsManager = ({ projectId }) => {
  const { getAccessToken, currentUser, isAdmin, isProjectManager } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  // State for inline editing
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    unitPrice: "",
    quantityAvailable: "",
    description: "",
  });

  const canManage = isAdmin || isProjectManager;

  useEffect(() => {
    if (currentUser) {
      fetchMaterials();
    }
  }, [projectId, currentUser]);

  const fetchMaterials = async () => {
    try {
      const token = getAccessToken();
      const url = projectId
        ? `${API_BASE_URL}/materials?projectId=${projectId}`
        : `${API_BASE_URL}/materials`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getAccessToken();
      const url = `${API_BASE_URL}/materials`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          unitPrice: parseFloat(formData.unitPrice),
          quantityAvailable: parseInt(formData.quantityAvailable) || 0,
          description: formData.description || undefined,
          projectId: projectId || undefined,
        }),
      });

      if (response.ok) {
        toast.success("Material added");
        fetchMaterials();
        closeDialog();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add material");
      }
    } catch (error) {
      toast.error("Failed to add material");
    }
  };

  const handleInlineUpdate = async (materialId) => {
    try {
      const token = getAccessToken();
      const url = `${API_BASE_URL}/materials/${materialId}`;
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editValues.name,
          unit: editValues.unit,
          unitPrice: parseFloat(editValues.unitPrice),
          quantityAvailable: parseInt(editValues.quantityAvailable) || 0,
          description: editValues.description || undefined,
          projectId: projectId || undefined,
        }),
      });

      if (response.ok) {
        toast.success("Material updated");
        fetchMaterials();
        setEditingId(null);
        setEditValues({});
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update material");
      }
    } catch (error) {
      toast.error("Failed to update material");
    }
  };

  const handleDelete = async (materialId) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/materials/${materialId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Material deleted");
        fetchMaterials();
      } else {
        toast.error("Failed to delete material");
      }
    } catch (error) {
      toast.error("Failed to delete material");
    }
  };

  const handleQuantityChange = async (materialId, change) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/materials/${materialId}/quantity`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ change }),
      });

      if (response.ok) {
        fetchMaterials();
        toast.success("Quantity updated");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update quantity");
      }
    } catch (error) {
      toast.error("Failed to update quantity");
    }
  };

  const startEditing = (material) => {
    setEditingId(material.id);
    setEditValues({
      name: material.name,
      unit: material.unit,
      unitPrice: material.unitPrice,
      quantityAvailable: material.quantityAvailable,
      description: material.description || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  const closeDialog = () => {
    setShowDialog(false);
    setFormData({
      name: "",
      unit: "",
      unitPrice: "",
      quantityAvailable: "",
      description: "",
    });
  };

  const inputClasses = "w-full px-2 py-1 text-sm border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Materials Inventory
          </h3>
          <span className="text-sm text-gray-500">({materials.length})</span>
        </div>
        {canManage && (
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <Plus className="size-4" />
            Add Material
          </button>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Package className="size-12 mx-auto mb-2 opacity-50" />
          <p>No materials added yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-2 text-left w-1/4">Name</th>
                <th className="px-4 py-2 text-left w-24">Unit</th>
                <th className="px-4 py-2 text-right w-32">Price/Unit</th>
                <th className="px-4 py-2 text-right w-40">Quantity</th>
                <th className="px-4 py-2 text-right w-32">Total Value</th>
                {canManage && <th className="px-4 py-2 text-right w-24">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {materials.map((material) => {
                const isEditing = editingId === material.id;
                
                return (
                  <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editValues.name}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className={inputClasses}
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            value={editValues.description}
                            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                            className={inputClasses}
                            placeholder="Description (optional)"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{material.name}</p>
                          {material.description && (
                            <p className="text-xs text-gray-500">{material.description}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.unit}
                          onChange={(e) => setEditValues({ ...editValues, unit: e.target.value })}
                          className={inputClasses}
                        />
                      ) : (
                        material.unit
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.unitPrice}
                          onChange={(e) => setEditValues({ ...editValues, unitPrice: e.target.value })}
                          className={inputClasses + " text-right"}
                        />
                      ) : (
                        `₹${Number(material.unitPrice).toLocaleString()}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.quantityAvailable}
                          onChange={(e) => setEditValues({ ...editValues, quantityAvailable: e.target.value })}
                          className={inputClasses + " text-right"}
                        />
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <button
                              onClick={() => handleQuantityChange(material.id, -1)}
                              className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-zinc-700 rounded hover:bg-gray-300"
                              disabled={material.quantityAvailable <= 0}
                            >
                              -
                            </button>
                          )}
                          <span className={`px-2 ${material.quantityAvailable <= 5 ? 'text-red-500 font-medium' : ''}`}>
                            {material.quantityAvailable}
                          </span>
                          {canManage && (
                            <button
                              onClick={() => handleQuantityChange(material.id, 1)}
                              className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-zinc-700 rounded hover:bg-gray-300"
                            >
                              +
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{(Number(material.unitPrice) * material.quantityAvailable).toLocaleString()}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleInlineUpdate(material.id)}
                                className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                title="Save"
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Cancel"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(material)}
                                className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title="Edit"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(material.id)}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Delete"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Material Dialog - Only for creating new materials */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Material
              </h3>
              <button onClick={closeDialog} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800"
                  placeholder="e.g., Cement, Steel Rods"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800"
                    placeholder="bags, kg, pcs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price/Unit (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantityAvailable}
                  onChange={(e) => setFormData({ ...formData, quantityAvailable: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Add Material
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsManager;
