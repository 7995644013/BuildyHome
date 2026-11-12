import { useState, useEffect, useRef } from "react";
import { Upload, X, Image as ImageIcon, Camera, ZoomIn, Calendar, Pencil, Check, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const PhotoUpload = ({ photos = [], onPhotoUpload, readOnly = false, taskId = null }) => {
  const { isAdmin, currentUser, getAccessToken } = useAuth();
  const [serverPhotos, setServerPhotos] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (taskId) {
      fetchTaskPhotos();
    }
  }, [taskId]);

  useEffect(() => {
    setServerPhotos(photos);
  }, [photos]);

  const fetchTaskPhotos = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/photos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setServerPhotos(data || []);
        if (onPhotoUpload) onPhotoUpload(data || []);
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
    }
  };

  // Convert file to base64 for storage
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error("Please upload only image files (PNG, JPG, GIF, WebP)");
      return;
    }

    // Validate file size (max 5MB per file)
    const oversizedFiles = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Some files are too large. Maximum size is 5MB per file.");
      return;
    }

    try {
      const newPending = await Promise.all(
        files.map(async (file, index) => {
          const base64Data = await fileToBase64(file);
          return {
            id: `pending_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            url: base64Data,
            name: file.name,
            size: file.size,
            type: file.type,
            isPending: true,
            uploadedBy: {
              name: currentUser?.name || "You",
            },
            uploadedAt: new Date().toISOString(),
          };
        })
      );

      setPendingPhotos(prev => [...prev, ...newPending]);
      toast.success(`${newPending.length} photo(s) selected. Click "Upload" to save.`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("File processing error:", error);
      toast.error("Failed to process selected photos.");
    }
  };

  const handleUploadPending = async () => {
    if (pendingPhotos.length === 0) return;
    
    setUploading(true);
    const token = getAccessToken();
    let successCount = 0;
    
    try {
      if (taskId) {
        const uploadPromises = pendingPhotos.map(async (photo) => {
          const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/photos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              photoUrl: photo.url,
              caption: photo.caption || "",
            }),
          });
          
          if (!response.ok) throw new Error("Upload failed");
          successCount++;
          return await response.json();
        });

        await Promise.all(uploadPromises);
        setPendingPhotos([]);
        fetchTaskPhotos();
      } else {
        // No taskId, just move to serverPhotos (local simulation/creation mode)
        setServerPhotos(prev => [...prev, ...pendingPhotos.map(p => ({ ...p, isPending: false }))]);
        setPendingPhotos([]);
        if (onPhotoUpload) onPhotoUpload([...serverPhotos, ...pendingPhotos]);
        successCount = pendingPhotos.length;
      }
      
      toast.success(`${successCount} photo(s) uploaded successfully!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload some photos. ${successCount} succeeded.`);
      // In a robust implementation, we might filter out only the successful ones from pending
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async (photo) => {
    if (photo.isPending) {
      // Just remove from pending state
      setPendingPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast.success("Removed from queue");
      return;
    }

    // Server deletion logic
    if (taskId) {
      try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/photos/${photo.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok && response.status !== 404) {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || "Failed decrease remove photo from server");
          return;
        }
      } catch (error) {
        console.error("Error deleting photo:", error);
        toast.error("Failed to remove photo");
        return;
      }
    }

    const updatedPhotos = serverPhotos.filter((p) => p.id !== photo.id);
    setServerPhotos(updatedPhotos);

    if (onPhotoUpload) {
      onPhotoUpload(updatedPhotos);
    }

    toast.success("Photo removed");
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleDownload = (photo) => {
    const link = document.createElement("a");
    link.href = photo.url || photo.photoUrl;
    link.download = photo.name || "photo.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateCaption = async () => {
    if (!taskId || !selectedPhoto || selectedPhoto.isPending) return;
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/photos/${selectedPhoto.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ caption: captionText }),
      });

      if (response.ok) {
        // Update local state
        const updatedPhotos = serverPhotos.map(p => 
          p.id === selectedPhoto.id ? { ...p, caption: captionText } : p
        );
        setServerPhotos(updatedPhotos);
        setSelectedPhoto({ ...selectedPhoto, caption: captionText });
        setEditingCaption(false);
        toast.success("Caption updated");
        if (onPhotoUpload) onPhotoUpload(updatedPhotos);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update caption");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const startEditCaption = () => {
    setCaptionText(selectedPhoto?.caption || "");
    setEditingCaption(true);
  };

  const [zoomLevel, setZoomLevel] = useState(1);
  const allPhotos = [...serverPhotos, ...pendingPhotos];

  // Reset zoom when photo changes
  useEffect(() => {
    setZoomLevel(1);
  }, [selectedPhoto]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedPhoto(null);
      if (e.key === "ArrowLeft") handlePrevPhoto();
      if (e.key === "ArrowRight") handleNextPhoto();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, allPhotos]);

  const handleNextPhoto = (e) => {
    e?.stopPropagation();
    const currentIndex = allPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex < allPhotos.length - 1) {
      setSelectedPhoto(allPhotos[currentIndex + 1]);
    } else {
      // Loop to start
      setSelectedPhoto(allPhotos[0]);
    }
  };

  const handlePrevPhoto = (e) => {
    e?.stopPropagation();
    const currentIndex = allPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(allPhotos[currentIndex - 1]);
    } else {
      // Loop to end
      setSelectedPhoto(allPhotos[allPhotos.length - 1]);
    }
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Work Photographs ({allPhotos.length})
          </span>
        </div>
        {allPhotos.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Click to view full size
          </span>
        )}
      </div>

      {/* Action Bar (Upload Button) */}
      {!readOnly && !isAdmin && pendingPhotos.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {pendingPhotos.length} photo(s) waiting to be uploaded
          </span>
          <button
            onClick={handleUploadPending}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {uploading ? (
              "Uploading..."
            ) : (
              <>
                <Save className="size-4" /> Upload Now
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload Button - Only for site engineers (users), not admins */}
      {!readOnly && !isAdmin && (
        <label
          className={`flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            uploading
              ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
          }`}
        >
          <div
            className={`p-3 rounded-full ${
              uploading
                ? "bg-blue-100 dark:bg-blue-900/30"
                : "bg-gray-100 dark:bg-zinc-800"
            }`}
          >
            <Upload
              className={`size-5 ${
                uploading
                  ? "text-blue-500 animate-pulse"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            />
          </div>
          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {uploading ? "Processing..." : "Select photos to upload"}
            </span>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              PNG, JPG up to 5MB each
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}

      {/* Upload Requirement Notice */}
      {!readOnly && !isAdmin && allPhotos.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Camera className="size-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Upload work photographs before marking as complete
          </p>
        </div>
      )}

      {/* Photo Grid */}
      {allPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {allPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`relative group aspect-square rounded-lg overflow-hidden border ${
                photo.isPending 
                  ? "border-amber-400 ring-2 ring-amber-400/30" 
                  : "border-gray-200 dark:border-zinc-700"
              } bg-gray-100 dark:bg-zinc-800`}
            >
              <img
                src={photo.url || photo.photoUrl}
                alt={photo.name}
                className={`w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105 ${photo.isPending ? 'opacity-80' : ''}`}
                onClick={() => setSelectedPhoto(photo)}
              />

              {/* Status Overlay */}
              {photo.isPending && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] uppercase font-bold rounded shadow-sm">
                  Pending
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                 {/* Only show zoom icon, no clickable area blocking the image click */}
                <ZoomIn className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Remove Button - Only for users who uploaded */}
              {!readOnly && !isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto(photo);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 pointer-events-auto"
                  title="Remove photo"
                >
                  <X className="size-3" />
                </button>
              )}

              {/* Photo Info */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                <p className="text-[10px] text-white truncate">{photo.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin View - Read Only Notice */}
      {isAdmin && allPhotos.length === 0 && (
        <div className="text-center py-6 border border-dashed border-gray-200 dark:border-zinc-700 rounded-lg">
          <ImageIcon className="size-8 mx-auto text-gray-400 dark:text-zinc-500 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No photos uploaded yet
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Site engineer will upload work photographs
          </p>
        </div>
      )}

      {/* Empty State for Users - shown only when no upload section is visible */}
      {!isAdmin && allPhotos.length === 0 && readOnly && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          No photos have been uploaded yet
        </p>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
            {/* Top Bar controls */}
           <div className="absolute top-4 right-4 flex items-center gap-2 z-[10000]">
             <div className="flex bg-white/10 rounded-lg overflow-hidden backdrop-blur-sm mr-2">
                 <button onClick={handleZoomOut} className="p-2 hover:bg-white/20 text-white" title="Zoom Out">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                 </button>
                 <span className="p-2 text-xs text-white flex items-center">{Math.round(zoomLevel * 100)}%</span>
                 <button onClick={handleZoomIn} className="p-2 hover:bg-white/20 text-white" title="Zoom In">
                    <ZoomIn className="size-5" />
                 </button>
             </div>
             
             <button
               onClick={() => setSelectedPhoto(null)}
               className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
               title="Close (Esc)"
             >
               <X className="size-6" />
             </button>
           </div>
           
           {/* Navigation Arrows */}
            {allPhotos.length > 1 && (
                <>
                <button 
                  onClick={handlePrevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-[10000] backdrop-blur-sm group"
                  title="Previous (Left Arrow)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button 
                  onClick={handleNextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-[10000] backdrop-blur-sm group"
                  title="Next (Right Arrow)"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                </>
            )}

            {/* Main Image Container */}
          <div
            className="relative max-w-7xl max-h-[85vh] w-full flex flex-col items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center scrollbar-hide">
                <img
                    src={selectedPhoto.url || selectedPhoto.photoUrl}
                    alt={selectedPhoto.name}
                    className="max-w-full max-h-[80vh] object-contain rounded-sm transition-transform duration-200 ease-out"
                    style={{ transform: `scale(${zoomLevel})` }}
                />
            </div>

            {/* Caption & Info Panel */}
            <div className="absolute bottom-4 left-0 right-0 mx-auto max-w-2xl bg-black/70 backdrop-blur-md rounded-xl p-4 text-white z-[10000]">
              <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                       {/* Caption Section */}
                      {(selectedPhoto.caption || editingCaption || (taskId && !selectedPhoto.isPending)) && (
                        <div className="mb-2">
                          {editingCaption ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={captionText}
                                onChange={(e) => setCaptionText(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm bg-white/20 border border-white/30 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/50"
                                placeholder="Add a caption..."
                                autoFocus
                              />
                              <button onClick={handleUpdateCaption} className="p-1.5 bg-green-500/80 hover:bg-green-600 rounded" title="Save">
                                <Check className="size-4" />
                              </button>
                              <button onClick={() => setEditingCaption(false)} className="p-1.5 bg-gray-500/80 hover:bg-gray-600 rounded" title="Cancel">
                                <X className="size-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/caption">
                              {selectedPhoto.caption ? (
                                <p className="text-sm font-medium">{selectedPhoto.caption}</p>
                              ) : (
                                <p className="text-sm italic text-gray-400">No caption</p>
                              )}
                              
                              {taskId && !readOnly && !selectedPhoto.isPending && (
                                <button onClick={startEditCaption} className="opacity-0 group-hover/caption:opacity-100 p-1 hover:bg-white/20 rounded transition-opacity" title="Edit caption">
                                  <Pencil className="size-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-300">
                          <span className="font-medium text-white truncate max-w-[200px]">{selectedPhoto.name}</span>
                           {selectedPhoto.uploadedBy && (
                            <span className="hidden sm:inline">• Uploaded by {selectedPhoto.uploadedBy.name}</span>
                          )}
                           {selectedPhoto.uploadedAt && (
                              <span className="hidden sm:inline text-gray-400">• {format(new Date(selectedPhoto.uploadedAt), "MMM dd, yyyy")}</span>
                          )}
                      </div>
                  </div>
                  
                  <button
                    onClick={() => handleDownload(selectedPhoto)}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors border border-white/10"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
