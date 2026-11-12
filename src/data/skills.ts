// Stack as domains, each with at most 3 anchor tools (Kyle, 2026-11-11: a full tool list reads cheap).
// Every tool comes from career-ops cv.md (Skills).
export interface SkillDomain {
  domain: string;
  items: string[];
}

export const SKILLS: SkillDomain[] = [
  { domain: "Frontend", items: ["React", "Next.js", "TypeScript"] },
  { domain: "Backend & APIs", items: ["Node.js", "FastAPI", "GraphQL"] },
  { domain: "Data engineering", items: ["Python", "PostgreSQL", "dbt"] },
  { domain: "ML & AI", items: ["PyTorch", "LangGraph"] },
  { domain: "Infra & CI/CD", items: ["Docker", "GitHub Actions", "Linux"] },
  { domain: "Product & UI design", items: ["Figma"] },
];
