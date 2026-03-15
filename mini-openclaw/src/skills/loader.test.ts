import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { buildSkillPrompt, loadSkills } from "./loader.js";

describe("skills loader", () => {
  it("loads markdown skills and builds prompt", () => {
    const dir = mkdtempSync(join(tmpdir(), "mini-openclaw-skills-"));
    try {
      writeFileSync(join(dir, "beta.md"), "Beta content");
      writeFileSync(join(dir, "alpha.md"), "Alpha content");

      const skills = loadSkills(dir);
      expect(skills.map((skill) => skill.name)).toEqual(["alpha", "beta"]);

      const prompt = buildSkillPrompt(skills);
      expect(prompt).toContain("Skill: alpha");
      expect(prompt).toContain("Alpha content");
      expect(prompt).toContain("Skill: beta");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
