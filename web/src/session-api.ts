import type { GraphDocument, InboxDocument, ReviewDocument } from "../../src/types.ts";

export async function loadGraph(): Promise<GraphDocument | null> {
  const res = await fetch("/.eagle-eye/graph.json");
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as GraphDocument;
}

export async function loadInbox(): Promise<InboxDocument> {
  const res = await fetch("/.eagle-eye/inbox.json");
  if (!res.ok) {
    return { version: 1, items: [] };
  }
  return (await res.json()) as InboxDocument;
}

export async function saveInbox(inbox: InboxDocument): Promise<void> {
  const res = await fetch("/.eagle-eye/inbox.json", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(inbox, null, 2),
  });
  if (!res.ok) {
    throw new Error(`Failed to write inbox.json (${res.status})`);
  }
}

export async function loadReview(): Promise<ReviewDocument> {
  const res = await fetch("/.eagle-eye/review.json");
  if (!res.ok) {
    return { version: 1, graphId: "", reviewed: [] };
  }
  return (await res.json()) as ReviewDocument;
}

export async function saveReview(review: ReviewDocument): Promise<void> {
  const res = await fetch("/.eagle-eye/review.json", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(review, null, 2),
  });
  if (!res.ok) {
    throw new Error(`Failed to write review.json (${res.status})`);
  }
}
