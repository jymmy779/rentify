'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Check, AlertCircle, HelpCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    const recoverUi = () => {
      if (document.visibilityState === 'visible') {
        setConfirmModal(null);
      }
    };

    window.addEventListener('pageshow', recoverUi);
    document.addEventListener('visibilitychange', recoverUi);

    return () => {
      window.removeEventListener('pageshow', recoverUi);
      document.removeEventListener('visibilitychange', recoverUi);
    };
  }, []);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const confirm = (options: ConfirmOptions) => {
    setConfirmModal(options);
  };

  return (
    <NotificationContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Global Toasts */}
      <div className="fixed top-8 right-4 md:right-8 z-300 flex flex-col gap-3 items-end max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border pointer-events-auto relative overflow-hidden animate-in fade-in slide-in-from-top-4 slide-in-from-right-4 duration-300 ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'
            }`}
          >
            {toast.type === 'success' ? <Check size={16} className="shrink-0 animate-bounce" /> : <AlertCircle size={16} className="shrink-0" />}
            <span className="font-bold text-xs md:text-sm">{toast.message}</span>
            {/* Thanh đếm ngược chạy ngang ở dưới đáy Toast */}
            <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-toast-progress"></div>
          </div>
        ))}
        <style jsx global>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
          .animate-toast-progress {
            animation: shrink 3s linear forwards;
          }
        `}</style>
      </div>

      {/* Global Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl dark:shadow-slate-950/40 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 transition-all duration-300">
            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center mb-6">
              <HelpCircle className="text-orange-600 dark:text-orange-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {confirmModal.cancelText || 'Hủy bỏ'}
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all active:scale-95"
              >
                {confirmModal.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
