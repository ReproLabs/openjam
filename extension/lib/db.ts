import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CaptureEvent, JamBlob, JamId, JamMetadata } from "./types";

interface OpenJamDB extends DBSchema {
  jams: {
    key: JamId;
    value: JamMetadata;
    indexes: { byCreatedAt: number };
  };
  blobs: {
    key: JamId;
    value: JamBlob;
  };
  events: {
    key: [JamId, number];
    value: CaptureEvent & { jamId: JamId; seq: number };
    indexes: { byJam: JamId };
  };
}

const DB_NAME = "openjam";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OpenJamDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OpenJamDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const jams = db.createObjectStore("jams", { keyPath: "id" });
        jams.createIndex("byCreatedAt", "createdAt");

        db.createObjectStore("blobs", { keyPath: "id" });

        const events = db.createObjectStore("events", {
          keyPath: ["jamId", "seq"],
        });
        events.createIndex("byJam", "jamId");
      },
    });
  }
  return dbPromise;
}

export async function saveJam(metadata: JamMetadata, blob: Blob) {
  const db = await getDb();
  const tx = db.transaction(["jams", "blobs"], "readwrite");
  await tx.objectStore("jams").put(metadata);
  await tx.objectStore("blobs").put({ id: metadata.id, blob });
  await tx.done;
}

export async function saveEvents(jamId: JamId, events: CaptureEvent[]) {
  if (events.length === 0) return;
  const db = await getDb();
  const tx = db.transaction("events", "readwrite");
  const store = tx.objectStore("events");
  const existing = await store.index("byJam").count(jamId);
  for (let i = 0; i < events.length; i++) {
    await store.put({ ...events[i], jamId, seq: existing + i });
  }
  await tx.done;
}

export async function listJams(): Promise<JamMetadata[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("jams", "byCreatedAt");
  return all.reverse();
}

export async function getJam(id: JamId): Promise<JamMetadata | undefined> {
  const db = await getDb();
  return db.get("jams", id);
}

export async function getJamBlob(id: JamId): Promise<Blob | undefined> {
  const db = await getDb();
  const record = await db.get("blobs", id);
  return record?.blob;
}

export async function getJamEvents(id: JamId): Promise<CaptureEvent[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex("events", "byJam", id);
  return records
    .sort((a, b) => a.seq - b.seq)
    .map(({ jamId: _jamId, seq: _seq, ...rest }) => rest as CaptureEvent);
}

export async function deleteJam(id: JamId) {
  const db = await getDb();
  const tx = db.transaction(["jams", "blobs", "events"], "readwrite");
  await tx.objectStore("jams").delete(id);
  await tx.objectStore("blobs").delete(id);
  const eventStore = tx.objectStore("events");
  const keys = await eventStore.index("byJam").getAllKeys(id);
  for (const key of keys) {
    await eventStore.delete(key);
  }
  await tx.done;
}

export async function renameJam(id: JamId, title: string) {
  const db = await getDb();
  const current = await db.get("jams", id);
  if (!current) return;
  await db.put("jams", { ...current, title });
}
