import type { CaptureEvent, NetworkEvent } from "@/lib/types";

interface RecordingSession {
  sourceTabId: number;
  sourceUrl: string;
  startedAt: number;
}

const OFFSCREEN_PATH = "/offscreen.html";

export default defineBackground(() => {
  console.log("OpenJam background worker started.");

  let session: RecordingSession | null = null;
  const pendingRequests = new Map<string, NetworkEvent>();

  async function ensureOffscreen() {
    const url = chrome.runtime.getURL(OFFSCREEN_PATH);
    const existing = await chrome.offscreen.hasDocument?.();
    if (existing) return;
    await chrome.offscreen.createDocument({
      url,
      reasons: ["USER_MEDIA" as chrome.offscreen.Reason],
      justification: "Recording the active tab via MediaRecorder.",
    });
  }

  async function closeOffscreen() {
    const has = await chrome.offscreen.hasDocument?.();
    if (has) await chrome.offscreen.closeDocument();
  }

  async function startRecording(opts: {
    tabAudio: boolean;
    mic: boolean;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id || !tab.url) {
        return { ok: false, error: "No active tab to record." };
      }

      const streamId = await new Promise<string>((resolve, reject) => {
        chrome.tabCapture.getMediaStreamId(
          { targetTabId: tab.id },
          (id) => {
            const err = chrome.runtime.lastError;
            if (err || !id) reject(new Error(err?.message ?? "no stream id"));
            else resolve(id);
          },
        );
      });

      await ensureOffscreen();

      const startedAt = Date.now();
      session = {
        sourceTabId: tab.id,
        sourceUrl: tab.url,
        startedAt,
      };

      await chrome.runtime.sendMessage({
        type: "offscreen:start",
        streamId,
        mic: opts.mic,
        tabAudio: opts.tabAudio,
        sourceUrl: tab.url,
        sourceTabId: tab.id,
        startedAt,
      });

      return { ok: true };
    } catch (e) {
      session = null;
      await closeOffscreen();
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async function stopRecording() {
    await chrome.runtime.sendMessage({ type: "offscreen:stop" }).catch(() => {});
  }

  function getStatus() {
    if (!session) return { recording: false as const };
    return {
      recording: true as const,
      startedAt: session.startedAt,
      sourceUrl: session.sourceUrl,
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;
    const m = msg as { type?: string };

    if (m.type === "ui:startRecording") {
      const opts = (msg as { options: { tabAudio: boolean; mic: boolean } })
        .options;
      void startRecording(opts).then(sendResponse);
      return true;
    }

    if (m.type === "ui:stopRecording") {
      void stopRecording().then(() => sendResponse({ ok: true }));
      return true;
    }

    if (m.type === "ui:status") {
      sendResponse(getStatus());
      return false;
    }

    if (m.type === "offscreen:saved") {
      session = null;
      pendingRequests.clear();
      const jamId = (msg as { jamId: string }).jamId;
      void closeOffscreen();
      void chrome.tabs.create({
        url: chrome.runtime.getURL(`/replay.html?id=${jamId}`),
      });
      void chrome.runtime.sendMessage({ type: "ui:saved", jamId }).catch(() => {});
      return false;
    }

    if (m.type === "offscreen:error") {
      session = null;
      pendingRequests.clear();
      void closeOffscreen();
      const error = (msg as { error: string }).error;
      void chrome.runtime.sendMessage({ type: "ui:error", error }).catch(() => {});
      return false;
    }

    if (m.type === "capture:event") {
      if (!session) return;
      const tabId = _sender.tab?.id;
      if (tabId == null || tabId !== session.sourceTabId) return;
      void chrome.runtime
        .sendMessage({
          type: "offscreen:event",
          event: (msg as { event: CaptureEvent }).event,
        })
        .catch(() => {});
      return false;
    }

    return false;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (session && session.sourceTabId === tabId) {
      void stopRecording();
    }
  });

  const forward = (event: CaptureEvent) => {
    if (!session) return;
    void chrome.runtime
      .sendMessage({ type: "offscreen:event", event })
      .catch(() => {});
  };

  const shouldTrack = (details: { tabId: number; url: string }) => {
    if (!session) return false;
    if (details.tabId !== session.sourceTabId) return false;
    if (details.url.startsWith("chrome-extension://")) return false;
    return true;
  };

  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (!shouldTrack(details)) return;
      const event: NetworkEvent = {
        kind: "network",
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        type: details.type,
        initiator: details.initiator,
        timestampMs: details.timeStamp,
        phase: "request",
      };
      pendingRequests.set(details.requestId, event);
      forward(event);
    },
    { urls: ["<all_urls>"] },
  );

  chrome.webRequest.onSendHeaders.addListener(
    (details) => {
      if (!shouldTrack(details)) return;
      const existing = pendingRequests.get(details.requestId);
      if (!existing) return;
      const headers: Record<string, string> = {};
      for (const h of details.requestHeaders ?? []) {
        if (h.name && h.value != null) headers[h.name] = h.value;
      }
      existing.requestHeaders = headers;
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders"],
  );

  chrome.webRequest.onCompleted.addListener(
    (details) => {
      if (!shouldTrack(details)) return;
      const existing = pendingRequests.get(details.requestId);
      const headers: Record<string, string> = {};
      for (const h of details.responseHeaders ?? []) {
        if (h.name && h.value != null) headers[h.name] = h.value;
      }
      const event: NetworkEvent = {
        ...(existing ?? {
          kind: "network",
          requestId: details.requestId,
          url: details.url,
          method: details.method,
          type: details.type,
          initiator: details.initiator,
          timestampMs: details.timeStamp,
          phase: "response",
        }),
        kind: "network",
        status: details.statusCode,
        responseHeaders: headers,
        durationMs: existing
          ? details.timeStamp - existing.timestampMs
          : undefined,
        timestampMs: details.timeStamp,
        phase: "response",
      };
      pendingRequests.delete(details.requestId);
      forward(event);
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"],
  );

  chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
      if (!shouldTrack(details)) return;
      const existing = pendingRequests.get(details.requestId);
      const event: NetworkEvent = {
        ...(existing ?? {
          kind: "network",
          requestId: details.requestId,
          url: details.url,
          method: details.method,
          type: details.type,
          initiator: details.initiator,
          timestampMs: details.timeStamp,
          phase: "error",
        }),
        kind: "network",
        errorText: details.error,
        timestampMs: details.timeStamp,
        phase: "error",
      };
      pendingRequests.delete(details.requestId);
      forward(event);
    },
    { urls: ["<all_urls>"] },
  );
});
