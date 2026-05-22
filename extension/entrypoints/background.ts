import type { CaptureEvent, NetworkEvent } from "@/lib/types";

interface RecorderSession {
  tabId: number;
  sourceTabId: number | null;
  startedAt: number;
}

export default defineBackground(() => {
  console.log("OpenJam background worker started.");

  let session: RecorderSession | null = null;
  const pendingRequests = new Map<string, NetworkEvent>();

  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (!msg || typeof msg !== "object") return;
    const m = msg as { type?: string };

    if (m.type === "recorder:started" && sender.tab?.id != null) {
      const startedAt = (msg as { startedAt?: number }).startedAt ?? Date.now();
      const url = new URL(sender.url ?? "");
      const sourceTabIdParam = url.searchParams.get("sourceTabId");
      session = {
        tabId: sender.tab.id,
        sourceTabId: sourceTabIdParam ? Number(sourceTabIdParam) : null,
        startedAt,
      };
    }

    if (m.type === "recorder:stopped") {
      session = null;
    }

    if (m.type === "capture:event" && session) {
      const tabId = sender.tab?.id;
      if (tabId == null || tabId !== session.sourceTabId) return;
      void chrome.tabs.sendMessage(session.tabId, msg).catch(() => {
        void chrome.runtime.sendMessage(msg).catch(() => {});
      });
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (session && session.tabId === tabId) session = null;
  });

  const forward = (event: CaptureEvent) => {
    if (!session) return;
    void chrome.tabs
      .sendMessage(session.tabId, { type: "capture:event", event })
      .catch(() => {
        void chrome.runtime
          .sendMessage({ type: "capture:event", event })
          .catch(() => {});
      });
  };

  const shouldTrack = (details: { tabId: number; url: string }) => {
    if (!session) return false;
    if (session.sourceTabId == null) return false;
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
