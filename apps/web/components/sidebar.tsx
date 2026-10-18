'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppShell } from './app-shell-context';
import { useUIStore } from '../lib/ui-store';

interface NavItem {
  name: string;
  icon: string;
  href: string;
  activeOn?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, user } = useAppShell();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [sidebarOpen, setSidebarOpen]);

  const groups: NavGroup[] = [
    {
      label: 'Operação',
      items: [
        { name: 'Visão geral', icon: 'home', href: '/dashboard' },
        { name: 'Itinerários', icon: 'route', href: '/trips', activeOn: ['/trips'] },
        { name: 'Clientes', icon: 'group', href: '/clients' },
      ],
    },
    {
      label: 'Conteúdo',
      items: [
        { name: 'Biblioteca', icon: 'collections_bookmark', href: '/library' },
      ],
    },
    {
      label: 'Gestão',
      items: [
        { name: 'Equipe', icon: 'badge', href: '/users' },
        { name: 'Configurações', icon: 'tune', href: '/settings' },
        ...(user?.role === 'platform_admin'
          ? [{ name: 'Admin SaaS', icon: 'admin_panel_settings', href: '/admin/agencies', activeOn: ['/admin'] }]
          : []),
      ],
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.activeOn) return item.activeOn.some((path) => pathname.startsWith(path));
    return pathname === item.href;
  };

  const navigate = (href: string) => {
    setSidebarOpen(false);
    router.prefetch(href);
  };

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-[#101828]/20 backdrop-blur-[2px] xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-[248px] flex-col overflow-hidden border-r border-outline-variant bg-white px-3.5 py-4 text-on-surface transition-transform duration-200 ease-out xl:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-12 items-center justify-between px-2">
          <Link
            href="/dashboard"
            prefetch={false}
            onMouseEnter={() => router.prefetch('/dashboard')}
            onClick={() => navigate('/dashboard')}
            className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-outline-variant bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings?.logoUrl || '/rumo-mark.svg'}
                alt=""
                className="h-7 w-7 object-contain"
                decoding="async"
              />
            </span>
            <span className="min-w-0">
              {settings?.logoUrl ? (
                <span className="block truncate text-[15px] font-bold tracking-[-0.02em]">
                  {settings.agencyName || 'Rumo'}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/rumo-logo.svg" alt="Rumo" className="h-4 w-auto" decoding="async" />
              )}
              <span className="block truncate text-[10px] font-medium text-on-surface/45">Workspace de viagens</span>
            </span>
          </Link>

          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-on-surface/55 hover:bg-surface-container xl:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <span className="material-symbols-outlined text-[19px]">close</span>
          </button>
        </div>

        <nav className="custom-scrollbar mt-6 flex-1 space-y-6 overflow-y-auto px-0.5 pb-4">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`nav-${group.label}`}>
              <h2
                id={`nav-${group.label}`}
                className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface/35"
              >
                {group.label}
              </h2>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={false}
                      onMouseEnter={() => router.prefetch(item.href)}
                      onFocus={() => router.prefetch(item.href)}
                      onClick={() => navigate(item.href)}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex h-10 items-center gap-3 rounded-xl border-l-2 px-3 text-[13px] font-medium transition-colors duration-150 ${
                        active
                          ? 'border-sky-compass bg-surface-container text-on-surface'
                          : 'border-transparent text-on-surface/62 hover:bg-surface-container-low hover:text-on-surface'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[19px]"
                        style={active ? { fontVariationSettings: "'FILL' 1, 'wght' 500" } : undefined}
                      >
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="border-t border-outline-variant pt-3">
          <Link
            href="/trips/new"
            prefetch={false}
            onMouseEnter={() => router.prefetch('/trips/new')}
            onFocus={() => router.prefetch('/trips/new')}
            onClick={() => navigate('/trips/new')}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-container active:scale-[.99]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova viagem
          </Link>
          <Link
            href="/logout"
            prefetch={false}
            className="mt-2 flex h-10 items-center gap-3 rounded-xl px-3 text-xs font-medium text-on-surface/50 hover:bg-surface-container-low hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sair da conta
          </Link>
        </div>
      </aside>
    </>
  );
}
