'use client';

import { useState } from 'react';

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

export default function DashboardNews() {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);

  const loadNews = async () => {
    setNewsLoading(true);
    try {
      const response = await fetch('/api/news');
      setNews(response.ok ? (await response.json()).slice(0, 3) : []);
    } catch {
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-primary">Radar de viagens</p>
          <h2 className="mt-1.5 text-base font-semibold">Notícias quando você precisar</h2>
          <p className="mt-1 text-[11px] text-on-surface/45">
            Este conteúdo só é carregado sob demanda para manter o painel rápido.
          </p>
        </div>
        {news === null && (
          <button
            type="button"
            onClick={() => void loadNews()}
            disabled={newsLoading}
            className="ui-btn ui-btn-secondary"
          >
            <span className={`material-symbols-outlined text-[17px] ${newsLoading ? 'animate-spin' : ''}`}>
              {newsLoading ? 'progress_activity' : 'newspaper'}
            </span>
            {newsLoading ? 'Carregando…' : 'Abrir radar'}
          </button>
        )}
      </div>

      {news !== null && (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {news.length ? (
            news.map((item) => (
              <a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-outline-variant p-4 transition-colors hover:bg-surface-container-low"
              >
                <span className="text-[9px] font-semibold uppercase tracking-[.12em] text-primary">{item.source}</span>
                <h3 className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed group-hover:text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-on-surface/45">
                  {item.description}
                </p>
              </a>
            ))
          ) : (
            <p className="col-span-full py-3 text-xs text-on-surface/45">
              O radar está temporariamente indisponível.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
