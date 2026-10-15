import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getNotes } from "../lib/content";

export async function GET(context: APIContext) {
  const notes = (await getNotes()).filter((n) => n.collection === "notes" && !n.data.draft);
  return rss({
    title: "Kyle Qin: notes",
    description: "Findings, workflows, and things I want to remember.",
    site: context.site!,
    items: notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      description: n.data.summary,
      link: `/notes/${n.id}`,
      categories: [n.data.kind, ...n.data.tags],
    })),
  });
}
