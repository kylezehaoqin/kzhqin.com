import { getCollection, type CollectionEntry } from "astro:content";

export type Note = CollectionEntry<"notes"> | CollectionEntry<"drafts">;
export type Project = CollectionEntry<"projects">;

/** Notes to show. Production: published notes only. `astro dev`: also drafts
 *  (draft: true) and the private, gitignored drafts folder. Newest first. */
export async function getNotes(): Promise<Note[]> {
  const dev = import.meta.env.DEV;
  const notes = await getCollection("notes", ({ data }) => dev || data.draft !== true);
  const drafts = dev ? await getCollection("drafts") : [];
  return [...notes, ...drafts].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const isDraft = (n: Note) => n.collection === "drafts" || n.data.draft;

/** Newest year first, then the `order` field. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection("projects");
  return all.sort((a, b) => b.data.year - a.data.year || (a.data.order ?? 99) - (b.data.order ?? 99));
}

export const monthYear = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export const longDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function readingMinutes(body: string | undefined): number {
  const words = (body ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
