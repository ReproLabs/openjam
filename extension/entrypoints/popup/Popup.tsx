import { useEffect, useRef, useState } from "react";

type Status =
  | { recording: false }
  | { recording: true; startedAt: number; sourceUrl: string };

export function Popup() {
  const [tabAudio, setTabAudio] = useState(true);
  const [mic, setMic] = useState(false);
  const [status, setStatus] = useState<Status>({ recording: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<number | null>(null);

  const refreshStatus = async () => {
    const res = (await chrome.runtime.sendMessage({ type: "ui:status" })) as Status;
    setStatus(res);
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    if (status.recording) {
      const update = () => setElapsed(Date.now() - status.startedAt);
      update();
      tickRef.current = window.setInterval(update, 250);
      return () => {
        if (tickRef.current != null) window.clearInterval(tickRef.current);
      };
    }
    setElapsed(0);
  }, [status]);

  const start = async () => {
    setBusy(true);
    setError(null);
    const res = (await chrome.runtime.sendMessage({
      type: "ui:startRecording",
      options: { tabAudio, mic },
    })) as { ok: true } | { ok: false; error: string };
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await refreshStatus();
  };

  const stop = async () => {
    setBusy(true);
    await chrome.runtime.sendMessage({ type: "ui:stopRecording" });
    setBusy(false);
    setStatus({ recording: false });
    window.close();
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("/dashboard.html") });
    window.close();
  };

  const seconds = Math.floor(elapsed / 1000);
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <h1 className="text-base font-semibold">OpenJam</h1>

      {status.recording ? (
        <>
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="font-mono text-lg">
              {mm}:{ss}
            </span>
            <span className="ml-auto text-xs text-gray-500">Recording</span>
          </div>
          <p className="truncate text-xs text-gray-500">{status.sourceUrl}</p>
          <button
            type="button"
            onClick={stop}
            disabled={busy}
            className="rounded-md bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            Stop recording
          </button>
        </>
      ) : (
        <>
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
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="rounded-md bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            Record this tab
          </button>
          <button
            type="button"
            onClick={openDashboard}
            className="rounded-md border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50"
          >
            Open dashboard
          </button>
        </>
      )}
    </div>
  );
}
