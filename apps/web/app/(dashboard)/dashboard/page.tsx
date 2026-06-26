'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalTrips: number;
  totalClients: number;
  totalUsers: number;
  totalPhotos: number;
  activeTrips: number;
}

interface TripSummary {
  status: string;
}

interface SessionUser {
  fullName: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalTrips: 0,
    totalClients: 0,
    totalUsers: 0,
    totalPhotos: 0,
    activeTrips: 0,
  });
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tripsRes, clientsRes, usersRes, libraryRes, meRes] = await Promise.all([
          fetch('/api/trips'),
          fetch('/api/clients'),
          fetch('/api/users'),
          fetch('/api/library'),
          fetch('/api/auth/me'),
        ]);

        const trips: TripSummary[] = await tripsRes.json();
        const clients = await clientsRes.json();
        const users = await usersRes.json();
        const library = await libraryRes.json();
        const me = meRes.ok ? await meRes.json() : { user: null };

        setStats({
          totalTrips: trips.length,
          totalClients: clients.length,
          totalUsers: users.length,
          totalPhotos: library.photos ? library.photos.length : 0,
          activeTrips: trips.filter((trip) => trip.status === 'Publicado' || trip.status === 'Confirmado').length,
        });
        setUser(me.user);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex-1 space-y-8">
      {/* Top Banner */}
      <div>
        <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">DASHBOARD</h2>
        <p className="text-on-surface opacity-75 text-sm mt-1">
          Bem-vindo de volta, {user?.fullName || 'consultor'}! Visao geral operacional da sua agencia de viagens.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin">sync</span>
          <span>Carregando estatísticas operacionais...</span>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Trips */}
            <div className="scroll-reveal bg-white border border-outline-variant p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-container-alt text-primary rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">flight_takeoff</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface opacity-60">Viagens Ativas</span>
                <p className="text-2xl font-bold text-on-surface">{stats.activeTrips}</p>
              </div>
            </div>

            {/* Total Trips */}
            <div className="scroll-reveal scroll-reveal-delay-100 bg-white border border-outline-variant p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-container-high text-secondary rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">route</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface opacity-60">Total Roteiros</span>
                <p className="text-2xl font-bold text-on-surface">{stats.totalTrips}</p>
              </div>
            </div>

            {/* Clients */}
            <div className="scroll-reveal scroll-reveal-delay-200 bg-white border border-outline-variant p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-status-active text-success rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">groups</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface opacity-60">Clientes Ativos</span>
                <p className="text-2xl font-bold text-on-surface">{stats.totalClients}</p>
              </div>
            </div>

            {/* Users */}
            <div className="scroll-reveal scroll-reveal-delay-300 bg-white border border-outline-variant p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-status-quoted text-error rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">shield</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface opacity-60">Agentes / Usuários</span>
                <p className="text-2xl font-bold text-on-surface">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions and Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="scroll-reveal scroll-reveal-delay-150 bg-white border border-outline-variant p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-sm text-primary uppercase tracking-wider mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/trips/new"
                  className="btn-interactive flex flex-col items-center justify-center p-4 border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container-low text-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-primary text-[28px] group-hover:scale-105 transition-transform">add_circle</span>
                  <span className="text-xs font-semibold text-on-surface">Novo Roteiro</span>
                </Link>
                <Link
                  href="/library"
                  className="btn-interactive flex flex-col items-center justify-center p-4 border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container-low text-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-primary text-[28px] group-hover:scale-105 transition-transform">folder_open</span>
                  <span className="text-xs font-semibold text-on-surface">Biblioteca</span>
                </Link>
                <Link
                  href="/security"
                  className="btn-interactive flex flex-col items-center justify-center p-4 border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container-low text-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-primary text-[28px] group-hover:scale-105 transition-transform">location_searching</span>
                  <span className="text-xs font-semibold text-on-surface">Rastrear Clientes</span>
                </Link>
                <Link
                  href="/users"
                  className="btn-interactive flex flex-col items-center justify-center p-4 border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container-low text-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-primary text-[28px] group-hover:scale-105 transition-transform">badge</span>
                  <span className="text-xs font-semibold text-on-surface">Gerenciar Time</span>
                </Link>
              </div>
            </div>

            {/* Quick Summary / IA Agent status */}
            <div className="scroll-reveal scroll-reveal-delay-250 bg-white border border-outline-variant p-6 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-primary uppercase tracking-wider mb-4">Assistente IA</h3>
                <div className="flex gap-4 items-start bg-surface-container-low p-4 rounded-lg">
                  <span className="material-symbols-outlined text-[36px] text-primary animate-pulse">auto_awesome</span>
                  <div className="space-y-1">
                    <p className="text-xs font-bold">IA Roteirista Ativa</p>
                    <p className="text-xs text-on-surface opacity-85 leading-relaxed">
                      Gerador de roteiros inteligentes conectado e pronto para processar dados de destino, clima e eventos em tempo real.
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface opacity-75">
                <span>Versão do Motor: Claude 3.5 Sonnet</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-success rounded-full"></span>
                  Operacional
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
