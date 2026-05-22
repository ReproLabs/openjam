import { useState } from "react";

export function Popup() {
  const [tabAudio, setTabAudio] = useState(true);
  const [mic, setMic] = useState(false);

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("/dashboard.html") });
    window.close();
  };

  const startRecording = async () => {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const sourceUrl = activeTab?.url ?? "";
    const params = new URLSearchParams({
      tabAudio: tabAudio ? "1" : "0",
      mic: mic ? "1" : "0",
      sourceUrl,
    });
    if (activeTab?.id != null) {
      params.set("sourceTabId", String(activeTab.id));
    }
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`/recorder.html?${params.toString()}`),
    });
    window.close();
  };

  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <h1 className="text-base font-semibold">OpenJam</h1>
      <p className="text-gray-500">Local-first bug capture.</p>

      <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tabAudio}
            onChange={(e) => setTabAudio(e.target.checked)}
          />
          <span>Capture tab audio</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={mic}
            onChange={(e) => setMic(e.target.checked)}
          />
          <span>Capture microphone</span>
        </label>
      </div>

      <button
        type="button"
        onClick={startRecording}
        className="rounded-md bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-500"
      >
        Start recording
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
