export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] animate-pulse space-y-7" aria-label="Carregando conteúdo">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-surface-container" />
        <div className="h-9 w-64 rounded-lg bg-surface-container" />
        <div className="h-3 w-80 max-w-full rounded bg-surface-container-low" />
      </div>

      <div className="h-24 rounded-2xl border border-outline-variant bg-white" />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-outline-variant bg-outline-variant md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 bg-white p-5">
            <div className="h-8 w-8 rounded-lg bg-surface-container" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
        <div className="h-[360px] rounded-2xl border border-outline-variant bg-white" />
        <div className="h-[300px] rounded-2xl border border-outline-variant bg-white" />
      </div>
    </div>
  );
}
