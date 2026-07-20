'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUIStore } from '../lib/ui-store';

interface AgencySettings {
  agencyName: string;
  logoUrl: string;
}

interface SessionUser {
  role: 'platform_admin' | 'agency_admin' | 'agent' | 'traveler';
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
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

    const handleBrandingUpdate = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AgencySettings>>).detail;
      setSettings((current) => ({
        agencyName: detail.agencyName || current?.agencyName || 'Rumo',
        logoUrl: detail.logoUrl ?? current?.logoUrl ?? '',
      }));
    };
    window.addEventListener('rumo:branding-updated', handleBrandingUpdate);
    return () => window.removeEventListener('rumo:branding-updated', handleBrandingUpdate);
  }, []);

  useEffect(() => {
    const warmRoutes = ['/dashboard', '/trips', '/trips/new', '/library', '/users', '/settings', '/security'];
    for (const href of warmRoutes) {
      router.prefetch(href);
    }
  }, [router]);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const navItems = [
    { name: 'Visão geral', icon: 'space_dashboard', href: '/dashboard' },
    { name: 'Viagens', icon: 'flight_takeoff', href: '/trips', activeOn: ['/trips', '/trips/new', '/trips/edit'] },
    { name: 'Clientes', icon: 'contacts', href: '/clients' },
    { name: 'Biblioteca', icon: 'local_library', href: '/library' },
    { name: 'Equipe', icon: 'group', href: '/users' },
    { name: 'Configurações', icon: 'tune', href: '/settings' },
    { name: 'Rastreamento', icon: 'location_searching', href: '/security' },
    ...(user?.role === 'platform_admin'
      ? [{ name: 'Admin SaaS', icon: 'admin_panel_settings', href: '/admin/agencies', activeOn: ['/admin'] }]
      : []),
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
        className={`w-[260px] h-screen fixed left-0 top-0 overflow-hidden bg-[linear-gradient(180deg,#061D59_0%,#041437_100%)] text-white flex flex-col py-6 px-4 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-[12px_0_40px_rgba(0,16,63,.12)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex items-center justify-between gap-3 mb-9 px-2">
          <div className="flex items-center gap-3">
            <div className="relative"><img src={settings?.logoUrl || '/rumo-mark.svg'} alt={settings?.agencyName || 'Rumo'} className="h-11 w-11 rounded-[14px] bg-white object-contain p-1 shadow-lg" /><span className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-[3px] border-primary-container bg-coral" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold leading-tight tracking-[-.02em] text-white">{settings?.agencyName || 'Rumo'}</h1>
              <p className="text-[9px] text-sky-compass uppercase tracking-[0.18em] truncate">
                {settings?.logoUrl ? 'Workspace da agência' : 'A sua bússola'}
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

        <p className="px-4 mb-2 text-[9px] font-bold uppercase tracking-[.22em] text-sky-compass/55">Workspace</p>
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch
                className={`flex items-center gap-3 py-3 px-4 rounded-xl text-sm transition-all duration-200 group ${
                  active ? 'sidebar-active' : 'text-white/60 hover:text-white hover:bg-white/[.07]'
                }`}
                onMouseEnter={() => router.prefetch(item.href)}
                onFocus={() => router.prefetch(item.href)}
              >
                <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
                <span className="text-[13px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 pt-6">
          <Link
            href="/trips/new"
            prefetch
            className="w-full bg-coral text-white py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#ff6847] active:scale-[.98] transition-all shadow-[0_10px_24px_rgba(255,84,45,.24)]"
            onMouseEnter={() => router.prefetch('/trips/new')}
            onFocus={() => router.prefetch('/trips/new')}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Criar nova viagem
          </Link>
          <div className="border-t border-white/10 pt-4">
            <Link
              href="/logout"
              className="flex items-center gap-3 py-3 px-4 rounded-xl text-white/55 hover:text-white hover:bg-white/[.07] transition-colors duration-200"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-xs font-semibold">Sair da conta</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
