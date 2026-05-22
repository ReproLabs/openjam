import { useEffect, useState } from "react";
import { deleteJam, listJams, renameJam } from "@/lib/db";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import type { JamMetadata } from "@/lib/types";

export function Dashboard() {
  const [jams, setJams] = useState<JamMetadata[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setJams(await listJams());
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openJam = (id: string) => {
    chrome.tabs.create({
      url: chrome.runtime.getURL(`/replay.html?id=${id}`),
    });
  };

  const startRename = (jam: JamMetadata) => {
    setEditingId(jam.id);
    setDraftTitle(jam.title);
  };

  const commitRename = async () => {
    if (!editingId) return;
    const title = draftTitle.trim() || "Untitled jam";
    await renameJam(editingId, title);
    setEditingId(null);
    await refresh();
  };

  const remove = async (jam: JamMetadata) => {
    const ok = window.confirm(`Delete "${jam.title}"? This can't be undone.`);
    if (!ok) return;
    await deleteJam(jam.id);
    await refresh();
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your jams</h1>
          <p className="text-sm text-gray-500">
            Captures are stored locally in this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => chrome.action.openPopup?.()}
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          Record new
        </button>
      </header>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : jams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">
            No jams yet. Click the extension icon to record one.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {jams.map((jam) => (
            <li key={jam.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                {editingId === jam.id ? (
                  <input
                    autoFocus
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => openJam(jam.id)}
                    className="block w-full truncate text-left font-medium hover:underline"
                  >
                    {jam.title}
                  </button>
                )}
                <p className="mt-1 truncate text-xs text-gray-500">
                  {jam.sourceUrl} · {formatDate(jam.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end text-xs text-gray-500">
                <span>{formatDuration(jam.durationMs)}</span>
                <span>{formatBytes(jam.sizeBytes)}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openJam(jam.id)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => startRename(jam)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => remove(jam)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
