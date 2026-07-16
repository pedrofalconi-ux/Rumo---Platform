'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '../lib/ui-store';
import { useNotificationStore } from '../lib/notification-store';

interface SessionUser {
  fullName: string;
  role: 'platform_admin' | 'agency_admin' | 'agent' | 'traveler';
  avatarUrl?: string;
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours} h`;
  return `Há ${diffDays} d`;
}

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const { toggleSidebar } = useUIStore();

  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotificationStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    };

    fetchUser();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const displayName = user?.fullName || 'Usuario';
  const displayRole =
    user?.role === 'platform_admin'
      ? 'Admin SaaS'
      : user?.role === 'agency_admin'
        ? 'Agente Admin'
        : user?.role === 'traveler'
          ? 'Viajante'
          : 'Consultor';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sectionName = pathname.startsWith('/trips')
    ? 'Viagens'
    : pathname.startsWith('/library')
      ? 'Biblioteca'
      : pathname.startsWith('/users')
        ? 'Equipe'
        : pathname.startsWith('/settings')
          ? 'Configurações'
          : pathname.startsWith('/security')
            ? 'Segurança'
            : pathname.startsWith('/admin')
              ? 'Admin SaaS'
              : 'Visão geral';

  return (
    <header className="h-[72px] sticky top-0 bg-[#f5f3ee]/90 backdrop-blur-xl border-b border-primary/8 flex justify-between items-center px-4 sm:px-6 lg:px-8 z-40">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Hamburger menu for mobile/tablet */}
        <button
          type="button"
          className="lg:hidden p-2 hover:bg-surface-container-high rounded-full text-on-surface transition-all active:scale-95 shrink-0"
          onClick={toggleSidebar}
          aria-label="Abrir menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div className="hidden sm:block min-w-[120px]">
          <p className="text-[9px] uppercase tracking-[.2em] font-bold text-on-surface/40">Rumo workspace</p>
          <p className="text-sm font-bold text-primary mt-0.5">{sectionName}</p>
        </div>
        <div className="hidden sm:block h-7 w-px bg-primary/10" />
        {/* Search Bar */}
        <div className="relative max-w-xs sm:max-w-sm w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface opacity-75 text-[20px]">
            search
          </span>
          <input
            className="w-full bg-white/70 border border-primary/10 rounded-xl py-2 pl-9 pr-3 text-xs focus:ring-2 focus:ring-primary/15 focus:border-primary/30 outline-none transition-all shadow-sm"
            placeholder="Buscar viagens, clientes..."
            type="text"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-1 sm:gap-4 shrink-0 pl-2">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="hover:bg-surface-container-low rounded-full p-2 text-on-surface relative active:scale-95 transition-all flex items-center justify-center"
            title="Notificações"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {mounted && unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-coral text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-[0_0_0_2px_rgba(255,255,255,1)] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white border border-outline-variant rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-150 flex flex-col max-h-[480px]">
              {/* Dropdown Header */}
              <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-primary">Notificações</h4>
                  {mounted && unreadCount > 0 && (
                    <p className="text-[10px] text-coral font-bold uppercase tracking-wider mt-0.5">
                      {unreadCount} novas notificações
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="p-1 hover:bg-surface-container rounded-lg text-primary text-[10px] font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1"
                    title="Marcar todas como lidas"
                  >
                    <span className="material-symbols-outlined text-xs">done_all</span>
                    Lidas
                  </button>
                  <button
                    type="button"
                    onClick={() => clearAll()}
                    className="p-1 hover:bg-surface-container rounded-lg text-error text-[10px] font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1"
                    title="Limpar tudo"
                  >
                    <span className="material-symbols-outlined text-xs">clear_all</span>
                    Limpar
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1 custom-scrollbar max-h-[320px] divide-y divide-outline-variant bg-white">
                {mounted && notifications.length > 0 ? (
                  notifications.map((notification) => {
                    const getToneIcon = () => {
                      switch (notification.tone) {
                        case 'success':
                          return { name: 'check_circle', color: 'text-success bg-success/10' };
                        case 'error':
                          return { name: 'error', color: 'text-error bg-error/10' };
                        default:
                          return { name: 'info', color: 'text-primary bg-primary/10' };
                      }
                    };
                    const icon = getToneIcon();

                    return (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-4 flex gap-3 transition-colors hover:bg-surface-container-low cursor-pointer relative group ${
                          !notification.read ? 'bg-primary/5 font-medium' : ''
                        }`}
                      >
                        {/* Left Icon */}
                        <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${icon.color}`}>
                          <span className="material-symbols-outlined text-[18px]">{icon.name}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-xs font-bold text-on-surface truncate">{notification.title}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-on-surface opacity-80 break-words font-normal">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-[9px] font-bold text-on-surface opacity-50">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>

                        {/* Read Indicator Dot */}
                        {!notification.read && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-coral rounded-full" />
                        )}

                        {/* Delete button (visible on hover) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="absolute right-2 top-2 h-6 w-6 rounded-full bg-white border border-outline shadow-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-error hover:text-white transition-all text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2 bg-surface-container-lowest">
                    <span className="material-symbols-outlined text-[44px] text-primary opacity-30">notifications_off</span>
                    <p className="text-xs text-on-surface opacity-60 font-semibold">Sem notificações para mostrar</p>
                    <p className="text-[10px] text-on-surface opacity-50">
                      Avisaremos você por aqui quando houver novidades.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {mounted && notifications.length > 0 && (
                <div className="p-2 border-t border-outline-variant bg-surface-container-lowest text-center">
                  <button
                    onClick={() => {
                      markAllAsRead();
                      setShowDropdown(false);
                    }}
                    className="w-full py-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-surface-container rounded-lg transition-all"
                  >
                    Marcar todas como lidas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="hover:bg-surface-container-low rounded-full p-2 text-on-surface active:scale-95 transition-all hidden sm:inline-block">
          <span className="material-symbols-outlined text-[22px]">help_outline</span>
        </button>
        <div className="h-6 w-[1px] bg-outline-variant mx-1 sm:mx-2"></div>
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
          <div className="text-right hidden md:block">
            <p className="font-label-md text-xs font-semibold text-on-surface leading-tight">{displayName}</p>
            <p className="text-[10px] text-on-surface opacity-60 uppercase tracking-wider mt-0.5">
              {displayRole}
            </p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-primary text-on-primary flex items-center justify-center text-xs font-bold shadow-[0_4px_12px_rgba(24,59,78,.16)] ring-2 ring-white">
            {user?.avatarUrl ? (
              <img className="w-full h-full object-cover" alt={displayName} src={user.avatarUrl} />
            ) : (
              initials || 'U'
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
