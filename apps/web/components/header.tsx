'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useAppShell } from './app-shell-context';
import { useNotificationStore } from '../lib/notification-store';
import { useUIStore } from '../lib/ui-store';

function formatRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours} h`;
  return `Há ${diffDays} d`;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAppShell();
  const { toggleSidebar } = useUIStore();
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotificationStore();

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleShortcut);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const displayName = user?.fullName || 'Usuário';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const sectionName = pathname.startsWith('/trips')
    ? 'Itinerários'
    : pathname.startsWith('/library')
      ? 'Biblioteca'
      : pathname.startsWith('/clients')
        ? 'Clientes'
        : pathname.startsWith('/users')
          ? 'Equipe'
          : pathname.startsWith('/settings')
            ? 'Configurações'
            : pathname.startsWith('/security')
              ? 'Rastreamento'
              : pathname.startsWith('/admin')
                ? 'Admin SaaS'
                : 'Visão geral';

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchRef.current?.value.trim();
    if (query) router.push(`/trips?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-outline-variant bg-white px-4 sm:px-7 lg:px-10 xl:px-12">
      <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-6">
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-outline-variant text-on-surface/65 hover:bg-surface-container-low xl:hidden"
          onClick={toggleSidebar}
          aria-label="Abrir menu"
        >
          <span className="material-symbols-outlined text-[21px]">menu</span>
        </button>

        <div className="hidden min-w-[104px] xl:block">
          <p className="text-[10px] font-medium text-on-surface/42">Você está em</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-on-surface">{sectionName}</p>
        </div>

        <form onSubmit={submitSearch} className="relative w-full max-w-[600px]">
          <label htmlFor="global-search" className="sr-only">Buscar viagens e clientes</label>
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface/38">
            search
          </span>
          <input
            id="global-search"
            ref={searchRef}
            type="search"
            autoComplete="off"
            className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-14 text-[13px] text-on-surface outline-none transition-colors placeholder:text-on-surface/38 hover:border-outline focus:border-primary/35 focus:bg-white focus:ring-2 focus:ring-primary/[.07]"
            placeholder="Buscar viagens, clientes..."
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-outline-variant bg-white px-2 py-1 text-[10px] font-medium text-on-surface/40 sm:block">
            ⌘K
          </kbd>
        </form>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Link
          href="/trips/new"
          prefetch={false}
          onMouseEnter={() => router.prefetch('/trips/new')}
          className="ui-btn ui-btn-secondary ui-btn-sm !hidden sm:!inline-flex"
        >
          <span className="material-symbols-outlined text-[17px]">add</span>
          Nova viagem
        </Link>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowNotifications((current) => !current)}
            className="relative grid h-9 w-9 place-items-center rounded-xl text-on-surface/55 transition-colors hover:bg-surface-container-low hover:text-on-surface"
            aria-label="Notificações"
            aria-expanded={showNotifications}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[8px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 z-50 flex max-h-[500px] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_24px_64px_rgba(11,30,58,.14)]">
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low/70 px-4 py-4">
                <div>
                  <h2 className="text-sm font-semibold">Notificações</h2>
                  <p className="mt-0.5 text-[10px] text-on-surface/45">
                    {unreadCount ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
                  </p>
                </div>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Marcar como lidas
                  </button>
                )}
              </div>

              <div className="custom-scrollbar flex-1 divide-y divide-outline-variant overflow-y-auto">
                {notifications.length ? (
                  notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={`group relative flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-container-low ${
                        notification.read ? 'bg-white' : 'bg-ice-blue/55'
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          notification.tone === 'success'
                            ? 'bg-status-active text-success'
                            : notification.tone === 'error'
                              ? 'bg-status-cancelled text-error'
                              : 'bg-ice-blue text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          {notification.tone === 'success' ? 'check' : notification.tone === 'error' ? 'priority_high' : 'info'}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 pr-5">
                        <span className="flex items-center gap-2">
                          <span className="block truncate text-xs font-semibold">{notification.title}</span>
                          {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-on-surface/58">{notification.message}</span>
                        <span className="mt-2 flex items-center gap-3 text-[9px] text-on-surface/38">
                          {formatRelativeTime(notification.createdAt)}
                          {!notification.read && (
                            <button type="button" onClick={() => markAsRead(notification.id)} className="font-semibold text-primary hover:underline">
                              Marcar como lida
                            </button>
                          )}
                        </span>
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.stopPropagation();
                            removeNotification(notification.id);
                          }
                        }}
                        className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-md text-on-surface/30 opacity-0 hover:bg-white hover:text-on-surface group-hover:opacity-100"
                        aria-label="Remover notificação"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="px-5 py-10 text-center">
                    <span className="material-symbols-outlined text-[30px] text-on-surface/22">notifications_off</span>
                    <p className="mt-2 text-xs font-medium">Nenhuma notificação</p>
                    <p className="mt-1 text-[10px] text-on-surface/42">Avisaremos quando algo precisar da sua atenção.</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-outline-variant p-2">
                  <button
                    type="button"
                    onClick={clearAll}
                    className="h-8 w-full rounded-lg text-[10px] font-medium text-on-surface/45 hover:bg-surface-container-low hover:text-on-surface"
                  >
                    Limpar notificações
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden h-6 w-px bg-outline-variant sm:block" />

        <div className="flex items-center gap-2.5 rounded-xl border border-transparent py-1 pl-1 sm:pr-1 md:border-outline-variant md:pr-2">
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-primary text-[10px] font-bold text-white">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" decoding="async" />
            ) : (
              initials || 'RU'
            )}
          </span>
          <span className="hidden max-w-[120px] truncate text-xs font-semibold md:block">{displayName}</span>
          <span className="material-symbols-outlined hidden text-[17px] text-on-surface/38 md:block">expand_more</span>
        </div>
      </div>
    </header>
  );
}
