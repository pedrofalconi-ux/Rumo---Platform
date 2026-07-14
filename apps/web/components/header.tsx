'use client';

import React, { useEffect, useState } from 'react';
import { useUIStore } from '../lib/ui-store';

interface SessionUser {
  fullName: string;
  role: 'platform_admin' | 'agency_admin' | 'agent' | 'traveler';
  avatarUrl?: string;
}

export default function Header() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const { toggleSidebar } = useUIStore();

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

  return (
    <header className="h-16 sticky top-0 bg-surface/95 backdrop-blur-xs border-b border-outline-variant flex justify-between items-center px-4 sm:px-6 z-40">
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

        {/* Search Bar */}
        <div className="relative max-w-xs sm:max-w-md w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface opacity-75 text-[20px]">
            search
          </span>
          <input
            className="w-full bg-surface-container-low border border-outline rounded-lg py-1.5 pl-9 pr-3 text-xs sm:text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            placeholder="Pesquisar..."
            type="text"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-1 sm:gap-4 shrink-0 pl-2">
        <button className="hover:bg-surface-container-low rounded-full p-2 text-on-surface relative active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
        </button>
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
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-primary overflow-hidden bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
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
