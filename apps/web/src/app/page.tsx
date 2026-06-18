import { ThemeToggle } from "../components/theme-toggle";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Machine Support System</p>
            <h1 className="text-2xl font-semibold">Service Desk</h1>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid flex-1 place-items-center py-10">
          <div className="w-full max-w-2xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-xl font-semibold">Support workflow is taking shape</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              The public QR request page is available at <span className="font-medium">/request/:publicId</span>.
              Scan links will open a mobile-friendly form connected to the backend ticket workflow.
            </p>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              The first technician workbench is available at <span className="font-medium">/technician/tickets</span>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
