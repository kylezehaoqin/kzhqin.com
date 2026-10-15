// Skills grouped by domain. Every item comes from career-ops cv.md (Skills);
// `proof` names project ids (src/content/projects/<id>.md) that show the domain in use.
export interface SkillDomain {
  domain: string;
  items: string[];
  proof: string[];
}

export const SKILLS: SkillDomain[] = [
  {
    domain: "Full-stack product",
    items: ["TypeScript", "React", "Next.js", "Node.js", "tRPC", "FastAPI", "PostgreSQL"],
    proof: ["servicebox", "determination-drill"],
  },
  {
    domain: "Data engineering & analytics",
    items: ["Python", "SQL", "dbt", "Dagster", "Pandas", "SQLite FTS5"],
    proof: ["deuce", "xhs-reader", "utrtools"],
  },
  {
    domain: "Infra & delivery",
    items: ["Docker", "GitHub Actions", "Linux", "Nginx", "Cloudflare", "CI/CD"],
    proof: ["servicebox", "tie"],
  },
];
