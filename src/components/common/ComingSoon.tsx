export function ComingSoon({ mr, en }: { mr: string; en: string }) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{mr}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{en}</p>
      </header>

      <section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">लवकरच येत आहे</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">This module is coming soon</p>
      </section>
    </div>
  );
}