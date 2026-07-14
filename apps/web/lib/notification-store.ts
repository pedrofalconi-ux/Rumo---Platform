'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  tone: 'success' | 'error' | 'info';
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (title: string, message: string, tone?: 'success' | 'error' | 'info') => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      addNotification: (title, message, tone = 'info') =>
        set((state) => {
          const newItem: NotificationItem = {
            id: String(Date.now() + Math.random()),
            title,
            message,
            tone,
            read: false,
            createdAt: new Date().toISOString(),
          };
          // Limit to last 50 notifications to prevent cluttering localStorage
          return {
            notifications: [newItem, ...state.notifications].slice(0, 50),
          };
        }),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'rumo-notifications-store',
    }
  )
);
