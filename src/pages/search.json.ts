import { getNotes, getProjects } from "../lib/content";
import { buildIndex } from "../lib/search";

// The ":" finder loads this on first use. buildIndex drops drafts.
export async function GET() {
  const notes = (await getNotes()).filter((n) => n.collection === "notes");
  // No notes yet: the finder does not offer the empty notes page either.
  const index = buildIndex({ notes, projects: await getProjects() }).filter((e) => notes.length > 0 || e.href !== "/notes");
  return new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json" } });
}
