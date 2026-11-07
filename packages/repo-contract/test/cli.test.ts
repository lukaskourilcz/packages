import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "dist", "cli.js");

function repoWith(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "repo-contract-"));
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content);
  return dir;
}

describe("repo-contract CLI", () => {
  beforeAll(() => {
    execFileSync(process.execPath, [path.join(root, "..", "..", "node_modules", "typescript", "bin", "tsc"), "-p", path.join(root, "tsconfig.build.json")]);
  });

  it("exits 0 when the repository follows the contract", () => {
    const dir = repoWith({
      "NEEDED.md": "- [ ] **Ship** it. [imp:3] [owner:me] [time:30m] [kind:deploy]\n",
      "about-project.md": "# App\n\n## Tech stack\n\n- **React** — the UI\n",
    });
    const run = spawnSync(process.execPath, [cli, "lint", dir], { encoding: "utf8" });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("no issues");
  });

  it("exits 1 and prints the line when a marker is missing", () => {
    const dir = repoWith({ "NEEDED.md": "- [ ] **Ship** it. [imp:3]\n", "about-project.md": "## Tech stack\n\n- **React** — the UI\n" });
    const run = spawnSync(process.execPath, [cli, "lint", dir], { encoding: "utf8" });
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("NEEDED.md:1  error  missing-owner");
  });

  it("prints the stack as JSON with --json", () => {
    const dir = repoWith({ "package.json": JSON.stringify({ dependencies: { zod: "^4.0.0" } }) });
    const run = spawnSync(process.execPath, [cli, "stack", dir, "--json"], { encoding: "utf8" });
    expect(JSON.parse(run.stdout)).toMatchObject({ source: "package-json", entries: [{ name: "zod" }] });
  });
});
