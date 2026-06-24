'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

interface AgencySettings {
  agencyName: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<AgencySettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const response = await fetch('/api/settings');
      if (response.ok) {
        setSettings(await response.json());
      }
    };

    fetchSettings();
  }, []);

  const navItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Viagens', icon: 'flight_takeoff', href: '/trips', activeOn: ['/trips', '/trips/new', '/trips/edit'] },
    { name: 'Biblioteca', icon: 'local_library', href: '/library' },
    { name: 'Usuarios', icon: 'group', href: '/users' },
    { name: 'Configuracoes', icon: 'settings', href: '/settings' },
    { name: 'Seguranca', icon: 'security', href: '/security' },
    { name: 'Suporte', icon: 'contact_support', href: '/support' },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.activeOn) {
      return item.activeOn.some((path) => pathname.startsWith(path));
    }
    return pathname === item.href;
  };

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 bg-surface border-r border-outline-variant flex flex-col py-6 px-4 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <img src="/rumo-mark.svg" alt="Rumo" className="h-11 w-11 rounded-full shadow-sm" />
        <div className="min-w-0">
          <h1 className="font-headline-sm text-lg font-bold text-primary leading-tight">Rumo</h1>
          <p className="font-label-md text-[10px] text-on-surface opacity-70 uppercase tracking-[0.16em] truncate">
            {settings?.agencyName || 'A sua bussola'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 py-3 px-4 rounded-sm text-sm transition-colors duration-200 group ${
                active ? 'sidebar-active scale-[0.98]' : 'text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
              <span className="font-label-md text-xs font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-6">
        <Link
          href="/trips/new"
          className="w-full bg-primary text-on-primary py-3 px-4 rounded-sm font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Nova Reserva
        </Link>
        <div className="border-t border-outline-variant pt-4">
          <Link
            href="/logout"
            className="flex items-center gap-3 py-3 px-4 rounded-sm text-on-surface hover:bg-surface-container-high transition-colors duration-200"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-xs font-semibold">Log Out</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
