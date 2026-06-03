"use client";

import { useState } from "react";
import { getFirebaseStorage } from "@/lib/firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useToast } from "@/components/providers/ToastProvider";
import { Camera, UploadCloud, X, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

interface PhotoUploadProps {
  currentPhotoUrl: string | null;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
}

export function PhotoUpload({ currentPhotoUrl, onUploadComplete, onRemove }: PhotoUploadProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    if (!user) {
      error("You must be logged in to upload photos.");
      return;
    }

    // Validation: Image only
    if (!file.type.startsWith("image/")) {
      error("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    // Validation: Max size 5MB
    if (file.size > 5 * 1024 * 1024) {
      error("Image must be smaller than 5MB.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const storage = getFirebaseStorage();
      // Store in profiles/{uid}/photo
      const storageRef = ref(storage, `profiles/${user.uid}/profile_photo_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(pct);
        },
        (err) => {
          console.error("Upload error:", err);
          error("Failed to upload image. Please try again.");
          setUploading(false);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            onUploadComplete(downloadUrl);
            success("Photo uploaded successfully!");
          } catch (urlErr) {
            console.error(urlErr);
            error("Failed to retrieve image URL.");
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (err) {
      console.error(err);
      error("Could not initialize upload.");
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {currentPhotoUrl ? (
        <div className="relative w-40 h-40 mx-auto group">
          <img
            src={currentPhotoUrl}
            alt="Profile Preview"
            className="w-full h-full object-cover rounded-2xl border-2 border-brand-500/50 shadow-lg transition-transform duration-250 group-hover:scale-[1.02]"
          />
          {onRemove && (
            <button
              onClick={onRemove}
              className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
              title="Remove Photo"
            >
              <X size={14} />
            </button>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl flex items-center justify-center pointer-events-none">
            <Camera size={24} className="text-white animate-pulse" />
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
            isDragActive
              ? "border-brand-500 bg-brand-500/10 scale-[1.01]"
              : "border-white/10 hover:border-brand-500/50 bg-surface-900/40"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              <p className="text-sm font-semibold text-brand-400">Uploading ({progress}%)</p>
              <div className="w-32 bg-surface-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-500 h-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <div className="p-3 bg-brand-500/10 text-brand-400 rounded-full border border-brand-500/20">
                <UploadCloud size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Drag & drop your picture here
                </p>
                <p className="text-[11px] text-surface-500 mt-1">
                  or click to browse (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
