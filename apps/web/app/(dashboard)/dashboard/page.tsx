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

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
  source: string;
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
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

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

    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news');
        if (res.ok) {
          const data = await res.json();
          setNews(data);
        }
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchStats();
    fetchNews();
  }, []);

  return (
    <div className="flex-1 space-y-7 max-w-[1480px] mx-auto animate-page-enter">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-coral" />Central de operações</div>
          <h2 className="mt-3 text-3xl sm:text-[38px] leading-tight font-extrabold text-primary tracking-[-.04em]">Olá, {user?.fullName?.split(' ')[0] || 'consultor'}.</h2>
          <p className="text-on-surface/55 text-sm mt-2">Aqui está o pulso da sua agência hoje.</p>
        </div>
        <Link href="/trips/new" className="btn-interactive inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-5 py-3 text-xs font-bold text-white shadow-[0_10px_24px_rgba(242,107,58,.20)]">
          <span className="material-symbols-outlined text-[18px]">add</span> Nova viagem
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin">sync</span>
          <span>Carregando estatísticas operacionais...</span>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Trips */}
            <div className="scroll-reveal rumo-card p-5 rounded-2xl flex items-center gap-4">
              <div className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">flight_takeoff</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-[.14em] text-on-surface/45">Viagens ativas</span>
                <p className="text-2xl font-extrabold text-primary">{stats.activeTrips}</p>
              </div>
            </div>

            {/* Total Trips */}
            <div className="scroll-reveal scroll-reveal-delay-100 rumo-card p-5 rounded-2xl flex items-center gap-4">
              <div className="w-11 h-11 bg-[#e8efed] text-primary rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">route</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface opacity-60">Total Roteiros</span>
                <p className="text-2xl font-extrabold text-primary">{stats.totalTrips}</p>
              </div>
            </div>

            {/* Clients */}
            <div className="scroll-reveal scroll-reveal-delay-200 rumo-card p-5 rounded-2xl flex items-center gap-4">
              <div className="w-11 h-11 bg-[#e7f2e9] text-success rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">groups</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface opacity-60">Clientes Ativos</span>
                <p className="text-2xl font-extrabold text-primary">{stats.totalClients}</p>
              </div>
            </div>

            {/* Users */}
            <div className="scroll-reveal scroll-reveal-delay-300 rumo-card p-5 rounded-2xl flex items-center gap-4">
              <div className="w-11 h-11 bg-[#fff0e9] text-coral rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">shield</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface opacity-60">Agentes / Usuários</span>
                <p className="text-2xl font-extrabold text-primary">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions and Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="scroll-reveal scroll-reveal-delay-150 rumo-card p-6 rounded-2xl">
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
            <div className="scroll-reveal scroll-reveal-delay-250 bg-primary text-white p-6 rounded-2xl shadow-[0_16px_40px_rgba(24,59,78,.16)] flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-4">Copiloto Rumo</h3>
                <div className="flex gap-4 items-start bg-white/[.08] p-4 rounded-xl border border-white/10">
                  <span className="material-symbols-outlined text-[36px] text-coral animate-pulse">auto_awesome</span>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">IA roteirista ativa</p>
                    <p className="text-xs text-white/65 leading-relaxed">
                      Gerador de roteiros inteligentes conectado e pronto para processar dados de destino, clima e eventos em tempo real.
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/55">
                <span>Versão do Motor: Claude 3.5 Sonnet</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-success rounded-full"></span>
                  Operacional
                </span>
              </div>
            </div>
          </div>

          {/* Rumo News Section */}
          <div className="scroll-reveal scroll-reveal-delay-300 rumo-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">newspaper</span>
                <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Rumo News: O Mundo das Viagens</h3>
              </div>
              <span className="text-xs text-on-surface opacity-60">Atualizado recentemente</span>
            </div>

            {newsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex flex-col gap-3">
                    <div className="bg-surface-container-high h-40 rounded-lg w-full"></div>
                    <div className="h-4 bg-surface-container-high rounded w-3/4"></div>
                    <div className="h-3 bg-surface-container-high rounded w-full"></div>
                    <div className="h-3 bg-surface-container-high rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {news.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col bg-surface-container-low hover:bg-surface-container-medium border border-outline-variant rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md"
                  >
                    {item.imageUrl ? (
                      <div className="h-40 overflow-hidden relative">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute bottom-2 left-2 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {item.source}
                        </span>
                      </div>
                    ) : (
                      <div className="h-40 bg-primary-container-alt text-primary flex items-center justify-center relative">
                        <span className="material-symbols-outlined text-4xl opacity-50">travel</span>
                        <span className="absolute bottom-2 left-2 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {item.source}
                        </span>
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-on-surface opacity-75 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-[10px] text-on-surface opacity-60 flex justify-between items-center pt-2 border-t border-outline-variant/50">
                        <span>{new Date(item.pubDate).toLocaleDateString('pt-BR')}</span>
                        <span className="flex items-center gap-0.5 font-semibold text-primary group-hover:translate-x-1 transition-transform">
                          Ler mais <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
