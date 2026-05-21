export function Dashboard() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Your jams</h1>
        <p className="text-sm text-gray-500">
          Captures are stored locally in this browser.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-gray-500">No jams yet. Click the extension icon to record one.</p>
      </div>
    </div>
  );
}
