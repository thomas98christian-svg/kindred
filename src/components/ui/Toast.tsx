"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number; // ms, default 4000
}

const VARIANT_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-400",
    progress: "bg-emerald-500",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    progress: "bg-red-500",
  },
  info: {
    icon: Info,
    bg: "bg-brand-500/10 border-brand-500/30",
    text: "text-brand-400",
    progress: "bg-brand-500",
  },
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  const config = VARIANT_CONFIG[toast.variant];
  const Icon = config.icon;
  const duration = toast.duration || 4000;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl ${config.bg}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon size={20} className={`shrink-0 ${config.text}`} />
        <p className="flex-1 text-sm font-medium text-foreground">
          {toast.message}
        </p>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={14} className="text-surface-400" />
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${config.progress}`}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
