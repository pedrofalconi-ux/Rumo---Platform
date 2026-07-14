'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUIStore } from '../lib/ui-store';

interface AgencySettings {
  agencyName: string;
}

interface SessionUser {
  role: 'platform_admin' | 'agency_admin' | 'agent' | 'traveler';
}

export default function Sidebar() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    const fetchSidebarData = async () => {
      const [settingsResponse, meResponse] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/auth/me'),
      ]);
      if (settingsResponse.ok) setSettings(await settingsResponse.json());
      if (meResponse.ok) {
        const data = await meResponse.json();
        setUser(data.user);
      }
    };

    fetchSidebarData();
  }, []);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const navItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Viagens', icon: 'flight_takeoff', href: '/trips', activeOn: ['/trips', '/trips/new', '/trips/edit'] },
    { name: 'Biblioteca', icon: 'local_library', href: '/library' },
    { name: 'Usuarios', icon: 'group', href: '/users' },
    { name: 'Configuracoes', icon: 'settings', href: '/settings' },
    { name: 'Seguranca', icon: 'security', href: '/security' },
    ...(user?.role === 'platform_admin'
      ? [{ name: 'Admin SaaS', icon: 'admin_panel_settings', href: '/admin/agencies', activeOn: ['/admin'] }]
      : []),
    { name: 'Suporte', icon: 'contact_support', href: '/support' },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.activeOn) {
      return item.activeOn.some((path) => pathname.startsWith(path));
    }
    return pathname === item.href;
  };

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-45 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`w-[260px] h-screen fixed left-0 top-0 bg-surface border-r border-outline-variant flex flex-col py-6 px-4 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-10 px-2">
          <div className="flex items-center gap-3">
            <img src="/rumo-mark.svg" alt="Rumo" className="h-11 w-11 rounded-full shadow-sm" />
            <div className="min-w-0">
              <h1 className="font-headline-sm text-lg font-bold text-primary leading-tight">Rumo</h1>
              <p className="font-label-md text-[10px] text-on-surface opacity-70 uppercase tracking-[0.16em] truncate">
                {settings?.agencyName || 'A sua bussola'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden p-1.5 hover:bg-surface-container-high rounded-full text-on-surface transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
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
            className="w-full bg-primary text-on-primary py-3 px-4 rounded-sm font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xs"
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
    </>
  );
}
