import fs from "node:fs";
import { describe, expect, it } from "vitest";

// The test job runs `npm ci` (third-party install scripts) with the job's token.
// Only the deploy job may push images, so only it may hold packages: write.
describe("presence workflow permissions", () => {
  const yml = fs.readFileSync(".github/workflows/presence.yml", "utf8").replace(/^\s*#.*$/gm, ""); // ignore comments
  const [top, jobs] = yml.split(/^jobs:\s*$/m);
  const testJob = jobs.split(/^  deploy:\s*$/m)[0];
  const deployJob = jobs.split(/^  deploy:\s*$/m)[1] ?? "";

  it("grants packages: write to the deploy job only", () => {
    expect(top).not.toMatch(/packages:\s*write/);
    expect(testJob).not.toMatch(/packages:\s*write/);
    expect(deployJob).toMatch(/permissions:\s*\n\s+contents: read\s*\n\s+packages: write/);
  });
});
