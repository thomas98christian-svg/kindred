"use client";

import { useState } from "react";
import { getFirebaseStorage } from "@/lib/firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useToast } from "@/components/providers/ToastProvider";
import { Camera, UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

interface MultiPhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

export function MultiPhotoUpload({ photos, onChange }: MultiPhotoUploadProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  // Track uploading state per slot index (0 to 5)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async (file: File, index: number) => {
    if (!user) {
      error("You must be logged in to upload photos.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      error("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error("Image must be smaller than 5MB.");
      return;
    }

    setUploadingIndex(index);
    setUploadProgress(0);

    try {
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, `profiles/${user.uid}/photo_${index}_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => {
          console.error("Upload error:", err);
          error("Failed to upload image. Please try again.");
          setUploadingIndex(null);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Insert or update photo at specific index
            const newPhotos = [...photos];
            newPhotos[index] = downloadUrl;
            
            // Filter out any empty items that might occur if indexes are non-sequential
            const cleanPhotos = newPhotos.filter(p => !!p);
            
            onChange(cleanPhotos);
            success("Photo uploaded successfully!");
          } catch (urlErr) {
            console.error(urlErr);
            error("Failed to retrieve image URL.");
          } finally {
            setUploadingIndex(null);
          }
        }
      );
    } catch (err) {
      console.error(err);
      error("Could not initialize upload.");
      setUploadingIndex(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0], index);
    }
  };

  const handleRemove = (index: number) => {
    const newPhotos = photos.filter((_, idx) => idx !== index);
    onChange(newPhotos);
    success("Photo removed.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-surface-400">
          Upload Profile Photos (Min 3)
        </label>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
          photos.length >= 3 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
        }`}>
          {photos.length} of 6 slots filled
        </span>
      </div>

      {/* Grid Layout for 6 Slots */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, idx) => {
          const photoUrl = photos[idx];
          const isUploading = uploadingIndex === idx;

          return (
            <div 
              key={idx} 
              className="relative aspect-[3/4] rounded-2xl overflow-hidden glass border border-white/5 flex flex-col items-center justify-center group hover:border-white/20 transition-all duration-350"
            >
              {photoUrl ? (
                <>
                  <img 
                    src={photoUrl} 
                    alt={`Photo slot ${idx + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors z-10"
                    title="Remove Photo"
                  >
                    <X size={12} />
                  </button>
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Camera size={18} className="text-white animate-pulse" />
                  </div>
                </>
              ) : isUploading ? (
                <div className="flex flex-col items-center justify-center p-2 text-center space-y-2">
                  <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                  <span className="text-[10px] font-semibold text-brand-400">{uploadProgress}%</span>
                  <div className="w-12 bg-surface-800 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors p-2 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, idx)}
                    disabled={uploadingIndex !== null}
                    className="hidden"
                  />
                  <UploadCloud size={20} className="text-surface-500 group-hover:text-brand-400 transition-colors mb-1" />
                  <span className="text-[9px] font-bold text-surface-400 group-hover:text-surface-200">Slot {idx + 1}</span>
                </label>
              )}
            </div>
          );
        })}
      </div>

      {photos.length < 3 && (
        <p className="text-[11px] font-semibold text-amber-500 italic flex items-center gap-1">
          ⚠️ Please upload at least 3 photos to proceed.
        </p>
      )}
    </div>
  );
}
