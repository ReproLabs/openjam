import { saveEvents, saveJam } from "@/lib/db";
import type { CaptureEvent, JamMetadata } from "@/lib/types";

interface StartMessage {
  type: "offscreen:start";
  streamId: string;
  mic: boolean;
  tabAudio: boolean;
  sourceUrl: string;
  sourceTabId: number;
  startedAt: number;
}

interface StopMessage {
  type: "offscreen:stop";
}

interface EventMessage {
  type: "offscreen:event";
  event: CaptureEvent;
}

type IncomingMessage = StartMessage | StopMessage | EventMessage;

let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let stream: MediaStream | null = null;
let micStream: MediaStream | null = null;
let events: CaptureEvent[] = [];
let session: {
  startedAt: number;
  sourceUrl: string;
  mimeType: string;
  hasAudio: boolean;
  hasMic: boolean;
} | null = null;

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

async function start(msg: StartMessage) {
  const constraints = {
    audio: msg.tabAudio
      ? {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: msg.streamId,
          },
        }
      : false,
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: msg.streamId,
      },
    },
  } as unknown as MediaStreamConstraints;

  stream = await navigator.mediaDevices.getUserMedia(constraints);

  // tab audio is captured as a separate output by Chrome; without this, the
  // user's tab goes silent during recording. re-route it to the speakers.
  if (msg.tabAudio) {
    const audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(stream);
    src.connect(audioCtx.destination);
  }

  let combined = stream;
  if (msg.mic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      combined = new MediaStream([
        ...stream.getVideoTracks(),
        ...stream.getAudioTracks(),
        ...micStream.getAudioTracks(),
      ]);
    } catch (e) {
      console.warn("OpenJam: mic denied, continuing without it.", e);
    }
  }

  const mimeType = pickMimeType();
  recorder = new MediaRecorder(combined, { mimeType });
  chunks = [];
  events = [];
  session = {
    startedAt: msg.startedAt,
    sourceUrl: msg.sourceUrl,
    mimeType,
    hasAudio: msg.tabAudio,
    hasMic: msg.mic,
  };

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = () => void finish();

  stream.getVideoTracks()[0].addEventListener("ended", () => {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  });

  recorder.start(1000);
}

function stop() {
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }
}

async function finish() {
  if (!session) return;
  try {
    const durationMs = Date.now() - session.startedAt;
    const blob = new Blob(chunks, { type: session.mimeType });
    const id = crypto.randomUUID();
    const metadata: JamMetadata = {
      id,
      title: `Jam ${new Date(session.startedAt).toLocaleString()}`,
      createdAt: session.startedAt,
      durationMs,
      sourceUrl: session.sourceUrl,
      mimeType: session.mimeType,
      sizeBytes: blob.size,
      hasAudio: session.hasAudio,
      hasMic: session.hasMic,
    };
    await saveJam(metadata, blob);
    await saveEvents(id, events);

    chrome.runtime.sendMessage({ type: "offscreen:saved", jamId: id });
  } catch (e) {
    chrome.runtime.sendMessage({
      type: "offscreen:error",
      error: e instanceof Error ? e.message : String(e),
    });
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    stream = null;
    micStream = null;
    recorder = null;
    chunks = [];
    events = [];
    session = null;
  }
}

chrome.runtime.onMessage.addListener((raw) => {
  const msg = raw as IncomingMessage;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "offscreen:start") {
    void start(msg).catch((e) => {
      chrome.runtime.sendMessage({
        type: "offscreen:error",
        error: e instanceof Error ? e.message : String(e),
      });
    });
  } else if (msg.type === "offscreen:stop") {
    stop();
  } else if (msg.type === "offscreen:event" && session) {
    const relative: CaptureEvent = {
      ...msg.event,
      timestampMs: msg.event.timestampMs - session.startedAt,
    };
    if (relative.timestampMs >= 0) events.push(relative);
  }
});
