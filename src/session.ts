import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./hash.ts";
import type { GraphDocument, InboxDocument, ReviewDocument } from "./types.ts";

export function sessionDir(root: string): string {
  return path.join(root, ".eagle-eye");
}

export function graphPath(root: string): string {
  return path.join(sessionDir(root), "graph.json");
}

export function inboxPath(root: string): string {
  return path.join(sessionDir(root), "inbox.json");
}

export function reviewPath(root: string): string {
  return path.join(sessionDir(root), "review.json");
}

export async function writeGraph(root: string, graph: GraphDocument): Promise<string> {
  const dest = graphPath(root);
  await mkdir(sessionDir(root), { recursive: true });
  await writeFile(dest, canonicalJson(graph), "utf8");
  return dest;
}

export async function readInbox(root: string): Promise<InboxDocument> {
  try {
    const raw = await readFile(inboxPath(root), "utf8");
    return JSON.parse(raw) as InboxDocument;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, items: [] };
    }
    throw new Error("Failed to read Eagle Eye inbox", { cause: error });
  }
}

export async function writeInbox(root: string, inbox: InboxDocument): Promise<void> {
  await mkdir(sessionDir(root), { recursive: true });
  await writeFile(inboxPath(root), canonicalJson(inbox), "utf8");
}

export async function readReview(root: string): Promise<ReviewDocument> {
  try {
    const raw = await readFile(reviewPath(root), "utf8");
    return JSON.parse(raw) as ReviewDocument;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, graphId: "", reviewed: [] };
    }
    throw new Error("Failed to read Eagle Eye review state", { cause: error });
  }
}

export async function writeReview(root: string, review: ReviewDocument): Promise<void> {
  await mkdir(sessionDir(root), { recursive: true });
  await writeFile(reviewPath(root), canonicalJson(review), "utf8");
}
