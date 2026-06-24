'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

export default function LogoutPage() {
  const router = useRouter();

  React.useEffect(() => {
    const logout = async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    };

    logout();
  }, [router]);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        <span className="material-symbols-outlined animate-spin text-primary">sync</span>
        Saindo da plataforma...
      </div>
    </main>
  );
}
