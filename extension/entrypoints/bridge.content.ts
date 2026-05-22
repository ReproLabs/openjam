import type { CaptureEvent } from "@/lib/types";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  main() {
    window.addEventListener("openjam:event", (e: Event) => {
      const event = (e as CustomEvent<CaptureEvent>).detail;
      if (!event) return;
      try {
        void chrome.runtime
          .sendMessage({ type: "capture:event", event })
          .catch(() => {});
      } catch {}
    });
  },
});
