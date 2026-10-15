// Builds /search.json for the ":" finder at build time. Drafts never enter it.

export interface NoteLike {
  id: string;
  data: { title: string; kind: string; summary: string; date: Date; tags: string[]; draft?: boolean };
}
export interface ProjectLike {
  id: string;
  data: { name: string; year: number; summary: string; tags: string[] };
}
export interface SearchEntry {
  kind: string; // "page" | "project" | a note kind
  name: string;
  text: string;
  meta?: string;
  href: string;
}

const PAGES: SearchEntry[] = [
  { kind: "page", name: "home", text: "The front page: intro, projects, latest notes.", href: "/" },
  { kind: "page", name: "projects", text: "Everything I have built, newest first.", href: "/projects" },
  { kind: "page", name: "notes", text: "Findings, workflows, and things I want to remember.", href: "/notes" },
  { kind: "page", name: "about", text: "Who I am, what I do, and where I have worked.", href: "/about" },
];

const monthYear = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export function buildIndex({ notes, projects }: { notes: NoteLike[]; projects: ProjectLike[] }): SearchEntry[] {
  return [
    ...PAGES,
    ...projects.map((p) => ({
      kind: "project",
      name: p.data.name,
      text: p.data.summary,
      meta: [String(p.data.year), ...p.data.tags].join(" · "),
      href: `/projects/${p.id}`,
    })),
    ...notes
      .filter((n) => n.data.draft !== true)
      .map((n) => ({
        kind: n.data.kind,
        name: n.data.title,
        text: n.data.summary,
        meta: [monthYear(n.data.date), ...n.data.tags].join(" · "),
        href: `/notes/${n.id}`,
      })),
  ];
}
