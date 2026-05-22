import { useEffect, useRef, useState } from "react";
import { saveEvents, saveJam } from "@/lib/db";
import type { CaptureEvent, JamMetadata } from "@/lib/types";

type Phase = "idle" | "starting" | "recording" | "saving" | "done" | "error";

function readOptionsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    tabAudio: params.get("tabAudio") === "1",
    mic: params.get("mic") === "1",
    sourceUrl: params.get("sourceUrl") ?? "",
  };
}

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "video/webm";
}

export function Recorder() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const eventsRef = useRef<CaptureEvent[]>([]);
  const startTsRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const optionsRef = useRef(readOptionsFromUrl());

  useEffect(() => {
    const onMessage = (msg: unknown) => {
      if (
        msg &&
        typeof msg === "object" &&
        (msg as { type?: string }).type === "capture:event"
      ) {
        const event = (msg as { event: CaptureEvent }).event;
        const relative: CaptureEvent = {
          ...event,
          timestampMs: event.timestampMs - startTsRef.current,
        };
        if (relative.timestampMs >= 0) {
          eventsRef.current.push(relative);
        }
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startTsRef.current);
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  async function start() {
    setPhase("starting");
    try {
      const { tabAudio, mic } = optionsRef.current;

      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: tabAudio,
      });

      let combined = display;
      if (mic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const tracks = [
            ...display.getVideoTracks(),
            ...display.getAudioTracks(),
            ...micStream.getAudioTracks(),
          ];
          combined = new MediaStream(tracks);
        } catch (e) {
          console.warn("OpenJam: mic permission denied, continuing without it.", e);
        }
      }

      streamRef.current = combined;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(combined, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => void finish(mimeType);

      display.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorder.state !== "inactive") recorder.stop();
      });

      startTsRef.current = Date.now();
      chrome.runtime.sendMessage({
        type: "recorder:started",
        startedAt: startTsRef.current,
      });
      recorder.start(1000);
      setPhase("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function finish(mimeType: string) {
    setPhase("saving");
    try {
      chrome.runtime.sendMessage({ type: "recorder:stopped" });
      const durationMs = Date.now() - startTsRef.current;
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const id = crypto.randomUUID();
      const sourceUrl = optionsRef.current.sourceUrl || "(unknown)";
      const metadata: JamMetadata = {
        id,
        title: `Jam ${new Date(startTsRef.current).toLocaleString()}`,
        createdAt: startTsRef.current,
        durationMs,
        sourceUrl,
        mimeType,
        sizeBytes: blob.size,
        hasAudio: optionsRef.current.tabAudio,
        hasMic: optionsRef.current.mic,
      };
      await saveJam(metadata, blob);
      await saveEvents(id, eventsRef.current);
      setPhase("done");
      const dashboardUrl = chrome.runtime.getURL(`/dashboard.html#${id}`);
      window.location.replace(dashboardUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  const seconds = Math.floor(elapsedMs / 1000);
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">OpenJam Recorder</h1>

      {phase === "starting" && (
        <p className="text-gray-300">Waiting for screen-share permission…</p>
      )}

      {phase === "recording" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="font-mono text-xl">
              {mm}:{ss}
            </span>
          </div>
          <p className="text-sm text-gray-400">
            Recording {optionsRef.current.sourceUrl || "your screen"}. You can switch
            to the tab you want to capture — this page will stay running.
          </p>
          <button
            type="button"
            onClick={stop}
            className="self-start rounded-md bg-red-600 px-4 py-2 font-medium hover:bg-red-500"
          >
            Stop recording
          </button>
        </div>
      )}

      {phase === "saving" && <p className="text-gray-300">Saving to local storage…</p>}

      {phase === "done" && (
        <p className="text-gray-300">Saved. Opening dashboard…</p>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-3">
          <p className="text-red-400">Could not start recording: {error}</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="self-start rounded-md border border-gray-500 px-4 py-2 hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
