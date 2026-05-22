import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import { getJam, getJamBlob, getJamEvents } from "@/lib/db";
import { formatDuration } from "@/lib/format";
import type { CaptureEvent, JamMetadata, NetworkEvent } from "@/lib/types";

type Tab = "console" | "network";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function levelColor(level: string) {
  if (level === "error") return "text-red-600";
  if (level === "warn") return "text-amber-600";
  if (level === "info") return "text-blue-600";
  return "text-gray-700";
}

function statusColor(status?: number) {
  if (status == null) return "text-gray-500";
  if (status >= 500) return "text-red-600";
  if (status >= 400) return "text-amber-600";
  if (status >= 300) return "text-blue-600";
  return "text-green-700";
}

export function Replay() {
  const [jam, setJam] = useState<JamMetadata | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [events, setEvents] = useState<CaptureEvent[]>([]);
  const [tab, setTab] = useState<Tab>("console");
  const [currentMs, setCurrentMs] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  const jamId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }, []);

  useEffect(() => {
    if (!jamId) {
      setError("No jam id in URL.");
      return;
    }
    let revoked: string | null = null;
    void (async () => {
      try {
        const [meta, blob, evts] = await Promise.all([
          getJam(jamId),
          getJamBlob(jamId),
          getJamEvents(jamId),
        ]);
        if (!meta || !blob) {
          setError("Jam not found.");
          return;
        }
        setJam(meta);
        const url = URL.createObjectURL(blob);
        revoked = url;
        setVideoUrl(url);
        setEvents(evts);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [jamId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentMs(v.currentTime * 1000);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [videoUrl]);

  const consoleEvents = events.filter((e) => e.kind === "console");
  const networkEvents = events.filter(
    (e): e is NetworkEvent => e.kind === "network",
  );

  const collapsedNetwork = useMemo(() => {
    const byReq = new Map<string, NetworkEvent>();
    for (const e of networkEvents) {
      const existing = byReq.get(e.requestId);
      if (
        !existing ||
        e.phase === "response" ||
        e.phase === "error" ||
        (e.phase === "request" && existing.phase === "request")
      ) {
        byReq.set(e.requestId, { ...(existing ?? e), ...e });
      }
    }
    return Array.from(byReq.values()).sort(
      (a, b) => a.timestampMs - b.timestampMs,
    );
  }, [networkEvents]);

  const seekTo = (ms: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, ms / 1000);
  };

  const exportVideo = async () => {
    if (!jam) return;
    const blob = await getJamBlob(jam.id);
    if (!blob) return;
    downloadBlob(blob, `${jam.title.replace(/[^\w-]+/g, "_")}.webm`);
  };

  const exportJson = async () => {
    if (!jam) return;
    const bundle = { jam, events };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `${jam.title.replace(/[^\w-]+/g, "_")}.json`);
  };

  const exportZip = async () => {
    if (!jam) return;
    const blob = await getJamBlob(jam.id);
    if (!blob) return;
    const zip = new JSZip();
    zip.file("video.webm", blob);
    zip.file(
      "metadata.json",
      JSON.stringify({ jam, events }, null, 2),
    );
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, `${jam.title.replace(/[^\w-]+/g, "_")}.zip`);
  };

  if (error) {
    return <div className="p-10 text-red-600">{error}</div>;
  }

  if (!jam || !videoUrl) {
    return <div className="p-10 text-gray-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{jam.title}</h1>
          <p className="text-sm text-gray-500">{jam.sourceUrl}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={exportVideo}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Export .webm
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Export .json
          </button>
          <button
            type="button"
            onClick={exportZip}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Export .zip
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="aspect-video w-full rounded-lg bg-black"
          />
          <p className="mt-2 text-xs text-gray-500">
            {formatDuration(currentMs)} / {formatDuration(jam.durationMs)}
          </p>
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setTab("console")}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                tab === "console"
                  ? "bg-gray-50 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Console ({consoleEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("network")}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                tab === "network"
                  ? "bg-gray-50 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Network ({collapsedNetwork.length})
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {tab === "console" ? (
              <ul className="divide-y divide-gray-100">
                {consoleEvents.map((e, i) => {
                  if (e.kind !== "console") return null;
                  const isCurrent = Math.abs(e.timestampMs - currentMs) < 500;
                  return (
                    <li
                      key={i}
                      className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${
                        isCurrent ? "bg-yellow-50" : ""
                      }`}
                      onClick={() => seekTo(e.timestampMs)}
                    >
                      <span className="w-12 shrink-0 font-mono text-gray-400">
                        {formatDuration(e.timestampMs)}
                      </span>
                      <span
                        className={`w-12 shrink-0 font-medium uppercase ${levelColor(e.level)}`}
                      >
                        {e.level}
                      </span>
                      <span className="min-w-0 break-words font-mono text-gray-700">
                        {e.args.join(" ")}
                      </span>
                    </li>
                  );
                })}
                {consoleEvents.length === 0 && (
                  <li className="p-6 text-center text-xs text-gray-400">
                    No console output captured.
                  </li>
                )}
              </ul>
            ) : (
              <ul className="divide-y divide-gray-100">
                {collapsedNetwork.map((e, i) => {
                  const isCurrent = Math.abs(e.timestampMs - currentMs) < 500;
                  return (
                    <li
                      key={i}
                      className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${
                        isCurrent ? "bg-yellow-50" : ""
                      }`}
                      onClick={() => seekTo(e.timestampMs)}
                    >
                      <span className="w-12 shrink-0 font-mono text-gray-400">
                        {formatDuration(e.timestampMs)}
                      </span>
                      <span className="w-12 shrink-0 font-semibold">
                        {e.method}
                      </span>
                      <span
                        className={`w-12 shrink-0 font-mono ${statusColor(e.status)}`}
                      >
                        {e.errorText ? "ERR" : e.status ?? "…"}
                      </span>
                      <span className="min-w-0 truncate font-mono text-gray-700">
                        {e.url}
                      </span>
                    </li>
                  );
                })}
                {collapsedNetwork.length === 0 && (
                  <li className="p-6 text-center text-xs text-gray-400">
                    No network activity captured.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
