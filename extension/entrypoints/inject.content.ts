export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    if ((window as unknown as { __openjamInjected?: boolean }).__openjamInjected)
      return;
    (window as unknown as { __openjamInjected: boolean }).__openjamInjected = true;

    const post = (detail: unknown) => {
      window.dispatchEvent(new CustomEvent("openjam:event", { detail }));
    };

    const safeArg = (a: unknown): string => {
      try {
        if (typeof a === "string") return a;
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        return JSON.stringify(a, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        );
      } catch {
        return String(a);
      }
    };

    const wrap = (level: "log" | "warn" | "error" | "info" | "debug") => {
      const original = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        try {
          post({
            kind: "console",
            level,
            args: args.map(safeArg),
            timestampMs: Date.now(),
          });
        } catch {}
        original(...args);
      };
    };
    (["log", "warn", "error", "info", "debug"] as const).forEach(wrap);

    window.addEventListener("error", (e) => {
      post({
        kind: "console",
        level: "error",
        args: [e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : ""],
        stack: e.error?.stack,
        timestampMs: Date.now(),
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason;
      post({
        kind: "console",
        level: "error",
        args: ["Unhandled promise rejection", safeArg(reason)],
        stack: reason?.stack,
        timestampMs: Date.now(),
      });
    });

    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const start = Date.now();
      const requestId = `f-${start}-${Math.random().toString(36).slice(2, 8)}`;
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      let requestBody: string | undefined;
      try {
        if (typeof init?.body === "string") requestBody = init.body.slice(0, 10000);
      } catch {}
      post({
        kind: "network",
        requestId,
        url,
        method,
        timestampMs: start,
        phase: "request",
        requestBody,
        initiator: "fetch",
      });
      try {
        const res = await origFetch(input as RequestInfo, init);
        const cloned = res.clone();
        let body: string | undefined;
        try {
          const text = await cloned.text();
          body = text.length > 50000 ? text.slice(0, 50000) + "…[truncated]" : text;
        } catch {}
        post({
          kind: "network",
          requestId,
          url,
          method,
          status: res.status,
          statusText: res.statusText,
          durationMs: Date.now() - start,
          responseBody: body,
          timestampMs: Date.now(),
          phase: "response",
          initiator: "fetch",
        });
        return res;
      } catch (err) {
        post({
          kind: "network",
          requestId,
          url,
          method,
          errorText: err instanceof Error ? err.message : String(err),
          timestampMs: Date.now(),
          phase: "error",
          initiator: "fetch",
        });
        throw err;
      }
    };

    const OrigXHR = window.XMLHttpRequest;
    function PatchedXHR(this: XMLHttpRequest) {
      const xhr = new OrigXHR();
      let url = "";
      let method = "GET";
      let start = 0;
      let requestId = "";
      let requestBody: string | undefined;

      const origOpen = xhr.open;
      xhr.open = function (m: string, u: string | URL, ...rest: unknown[]) {
        method = m.toUpperCase();
        url = typeof u === "string" ? u : u.href;
        // @ts-expect-error variadic forward
        return origOpen.call(xhr, m, u, ...rest);
      };

      const origSend = xhr.send;
      xhr.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        start = Date.now();
        requestId = `x-${start}-${Math.random().toString(36).slice(2, 8)}`;
        try {
          if (typeof body === "string") requestBody = body.slice(0, 10000);
        } catch {}
        post({
          kind: "network",
          requestId,
          url,
          method,
          timestampMs: start,
          phase: "request",
          requestBody,
          initiator: "xhr",
        });
        xhr.addEventListener("loadend", () => {
          let response: string | undefined;
          try {
            if (typeof xhr.responseText === "string") {
              response =
                xhr.responseText.length > 50000
                  ? xhr.responseText.slice(0, 50000) + "…[truncated]"
                  : xhr.responseText;
            }
          } catch {}
          post({
            kind: "network",
            requestId,
            url,
            method,
            status: xhr.status,
            statusText: xhr.statusText,
            durationMs: Date.now() - start,
            responseBody: response,
            timestampMs: Date.now(),
            phase: "response",
            initiator: "xhr",
          });
        });
        return origSend.call(xhr, body);
      };

      return xhr;
    }
    (window as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = PatchedXHR;
  },
});
