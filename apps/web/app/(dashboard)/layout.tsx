import Sidebar from '../../components/sidebar';
import Header from '../../components/header';
import { AppShellProvider } from '../../components/app-shell-context';
import { getDashboardShellData } from '../../lib/server-dashboard-data';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = await getDashboardShellData();

  return (
    <AppShellProvider initialData={{ user: shell.user, settings: shell.settings }}>
      <div className="app-shell flex min-h-screen bg-surface">
        <Sidebar />

        <div className="ml-0 flex min-h-screen min-w-0 w-full flex-1 flex-col xl:ml-[248px]">
          <Header />

          <main className="dashboard-content flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
            {children}
          </main>
        </div>
      </div>
    </AppShellProvider>
  );
}
