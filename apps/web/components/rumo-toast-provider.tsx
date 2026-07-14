'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '../lib/notification-store';

interface ToastState {
  id: number;
  message: string;
  title?: string;
  tone?: 'success' | 'error' | 'info';
}

declare global {
  interface Window {
    rumoToast?: (message: string, options?: Omit<ToastState, 'id' | 'message'>) => void;
  }
}

export default function RumoToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nativeAlert = window.alert;

    const showToast = (message: string, options?: Omit<ToastState, 'id' | 'message'>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const title = options?.title || 'Rumo';
      const tone = options?.tone || 'info';

      setToast({
        id: Date.now(),
        message,
        title,
        tone,
      });

      // Persist in the notification store
      useNotificationStore.getState().addNotification(title, message, tone);

      timeoutRef.current = setTimeout(() => setToast(null), 5200);
    };

    window.rumoToast = showToast;
    window.alert = (message?: unknown) => {
      showToast(String(message ?? ''), { title: 'Rumo' });
    };

    return () => {
      window.alert = nativeAlert;
      window.rumoToast = undefined;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const toneClass =
    toast?.tone === 'success'
      ? 'border-success/30'
      : toast?.tone === 'error'
        ? 'border-error/30'
        : 'border-primary/20';

  return (
    <>
      {children}
      <div className="fixed right-5 top-5 z-[200] pointer-events-none print:hidden">
        {toast && (
          <div
            key={toast.id}
            className={`pointer-events-auto w-[360px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border ${toneClass} bg-white shadow-2xl shadow-primary/15 animate-[rumoToastIn_220ms_ease-out]`}
          >
            <div className="h-1 bg-[linear-gradient(90deg,#002B5F,#FF6B4A)]" />
            <div className="flex gap-3 p-4">
              <div className="h-11 w-11 shrink-0 rounded-full bg-primary flex items-center justify-center shadow-inner">
                <img src="/rumo-mark.svg" alt="" className="h-9 w-9" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-primary">{toast.title}</p>
                  <button
                    type="button"
                    onClick={() => setToast(null)}
                    className="pointer-events-auto -mr-1 -mt-1 h-7 w-7 rounded-full hover:bg-surface-container-high text-on-surface/70 flex items-center justify-center"
                    aria-label="Fechar notificacao"
                  >
                    <span className="material-symbols-outlined text-[17px]">close</span>
                  </button>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-on-surface/80">{toast.message}</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface/45">
                  <span className="h-0.5 w-8 bg-coral" />
                  Rumo, a sua bussola
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
