// Skills grouped by layer. Every item comes from career-ops cv.md (Skills).
// Left out on purpose: Claude Code, Cursor, and the Gemini API (Kyle: too common or no longer used),
// Redis (cv.md correction: no code uses it), and Solidity (no project on the site uses it).
export interface SkillDomain {
  domain: string;
  items: string[];
}

export const SKILLS: SkillDomain[] = [
  { domain: "Languages", items: ["Python", "TypeScript", "SQL", "JavaScript", "Java", "C++", "C", "Go", "Bash", "PHP"] },
  { domain: "Frontend", items: ["React", "Next.js", "Tailwind CSS", "Vite", "React Query", "Zustand", "Radix UI", "shadcn/ui", "XState", "Three.js", "React Native"] },
  { domain: "Backend & APIs", items: ["Node.js", "FastAPI", "tRPC", "GraphQL / Apollo", "Fastify", "Flask", "Hono", "REST", "PayloadCMS"] },
  { domain: "Data", items: ["PostgreSQL", "dbt", "Dagster", "SQLite", "Pandas", "NumPy", "SciPy", "Pydantic", "Neo4j", "MongoDB", "Supabase", "Firebase"] },
  { domain: "ML & AI", items: ["LangGraph", "LangChain", "PyTorch", "OpenCV", "PaddleOCR", "recommender systems"] },
  { domain: "Infra & delivery", items: ["Docker", "GitHub Actions", "Linux", "Nginx", "Cloudflare", "CI/CD", "Render", "Dokploy", "Make", "Git"] },
  { domain: "Testing", items: ["pytest", "Jest", "dbt tests"] },
  { domain: "Design", items: ["Figma", "Relume", "Webflow"] },
];
