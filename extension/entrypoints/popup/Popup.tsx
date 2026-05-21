export function Popup() {
  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("/dashboard.html") });
  };

  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <h1 className="text-base font-semibold">OpenJam</h1>
      <p className="text-gray-500">Local-first bug capture.</p>
      <button
        type="button"
        disabled
        className="rounded-md bg-red-600 px-3 py-2 font-medium text-white opacity-50"
      >
        Start recording (coming soon)
      </button>
      <button
        type="button"
        onClick={openDashboard}
        className="rounded-md border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50"
      >
        Open dashboard
      </button>
    </div>
  );
}
