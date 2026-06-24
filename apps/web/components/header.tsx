'use client';

import React, { useEffect, useState } from 'react';

interface SessionUser {
  fullName: string;
  role: 'agency_admin' | 'agent' | 'traveler';
  avatarUrl?: string;
}

export default function Header() {
  const [user, setUser] = useState<SessionUser | null>(null);

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
  const displayRole = user?.role === 'agency_admin' ? 'Agente Admin' : user?.role === 'traveler' ? 'Viajante' : 'Consultor';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-16 sticky top-0 bg-surface border-b border-outline-variant flex justify-between items-center px-6 z-40">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface opacity-75">
            search
          </span>
          <input
            className="w-full bg-surface-container-low border border-outline rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            placeholder="Pesquisar viagens, IDs ou clientes..."
            type="text"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <button className="hover:bg-surface-container-low rounded-full p-2 text-on-surface relative active:scale-95 transition-all">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        <button className="hover:bg-surface-container-low rounded-full p-2 text-on-surface active:scale-95 transition-all">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="font-label-md text-xs font-semibold text-on-surface">{displayName}</p>
            <p className="text-[10px] text-on-surface opacity-60 uppercase tracking-wider">
              {displayRole}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
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
