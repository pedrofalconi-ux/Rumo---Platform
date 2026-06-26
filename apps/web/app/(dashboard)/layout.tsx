import Sidebar from '../../components/sidebar';
import Header from '../../components/header';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/server-auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role === 'traveler') {
    redirect('/app/trips');
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        {/* Top Header */}
        <Header />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      {/* Ambient background decoration */}
      <div className="fixed top-0 right-0 p-4 z-50 pointer-events-none">
        <div className="w-24 h-24 bg-primary/5 blur-3xl rounded-full"></div>
      </div>
    </div>
  );
}
