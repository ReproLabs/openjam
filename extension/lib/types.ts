export type JamId = string;

export interface JamMetadata {
  id: JamId;
  title: string;
  createdAt: number;
  durationMs: number;
  sourceUrl: string;
  mimeType: string;
  sizeBytes: number;
  hasAudio: boolean;
  hasMic: boolean;
}

export interface JamBlob {
  id: JamId;
  blob: Blob;
}

export type ConsoleLevel = "log" | "warn" | "error" | "info" | "debug";

export interface ConsoleEvent {
  kind: "console";
  level: ConsoleLevel;
  args: string[];
  stack?: string;
  timestampMs: number;
}

export type NetworkPhase = "request" | "response" | "error";

export interface NetworkEvent {
  kind: "network";
  requestId: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  durationMs?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  type?: string;
  initiator?: string;
  timestampMs: number;
  phase: NetworkPhase;
  errorText?: string;
}

export type CaptureEvent = ConsoleEvent | NetworkEvent;

export interface RecorderStartMessage {
  type: "recorder:start";
  options: { tabAudio: boolean; mic: boolean };
  sourceUrl: string;
  sourceTabId: number;
}

export interface CaptureEventMessage {
  type: "capture:event";
  event: CaptureEvent;
}
