import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type SkillDoc = {
  name: string;
  content: string;
};

export function loadSkills(dir: string): SkillDoc[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => {
      const fullPath = resolve(dir, entry.name);
      return {
        name: entry.name.replace(/\.md$/i, ""),
        content: readFileSync(fullPath, "utf8"),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSkillPrompt(skills: SkillDoc[]): string {
  if (skills.length === 0) {
    return "";
  }
  return skills.map((skill) => `## Skill: ${skill.name}\n${skill.content.trim()}`).join("\n\n");
}
