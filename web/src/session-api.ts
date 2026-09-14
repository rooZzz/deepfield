import type { GraphDocument, InboxDocument, ReviewDocument } from "../../src/types.ts";

export const sessionLive = import.meta.env?.VITE_DEEPFIELD_STATIC !== "1";

const DEMO_INBOX = "deepfield:demo-inbox";
const DEMO_REVIEW = "deepfield:demo-review";

function assetUrl(name: string): string {
  return `${import.meta.env?.BASE_URL ?? "/"}${name}`;
}

function liveUrl(name: string): string {
  return assetUrl(`.deepfield/${name}`);
}

export async function loadGraph(): Promise<GraphDocument | null> {
  const res = await fetch(sessionLive ? liveUrl("graph.json") : assetUrl("graph.json"));
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as GraphDocument;
}

export async function loadInbox(): Promise<InboxDocument> {
  if (!sessionLive) {
    return readLocal(DEMO_INBOX, { version: 1, items: [] });
  }
  const res = await fetch(liveUrl("inbox.json"));
  if (!res.ok) {
    return { version: 1, items: [] };
  }
  return (await res.json()) as InboxDocument;
}

export async function saveInbox(inbox: InboxDocument): Promise<void> {
  if (!sessionLive) {
    writeLocal(DEMO_INBOX, inbox);
    return;
  }
  const res = await fetch(liveUrl("inbox.json"), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(inbox, null, 2),
  });
  if (!res.ok) {
    throw new Error(`Failed to write inbox.json (${res.status})`);
  }
}

export async function loadReview(): Promise<ReviewDocument> {
  if (!sessionLive) {
    return readLocal(DEMO_REVIEW, { version: 1, graphId: "", reviewed: [] });
  }
  const res = await fetch(liveUrl("review.json"));
  if (!res.ok) {
    return { version: 1, graphId: "", reviewed: [] };
  }
  return (await res.json()) as ReviewDocument;
}

export async function saveReview(review: ReviewDocument): Promise<void> {
  if (!sessionLive) {
    writeLocal(DEMO_REVIEW, review);
    return;
  }
  const res = await fetch(liveUrl("review.json"), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(review, null, 2),
  });
  if (!res.ok) {
    throw new Error(`Failed to write review.json (${res.status})`);
  }
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error("Failed to read demo session", { cause: error });
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new Error("Failed to write demo session", { cause: error });
  }
}
