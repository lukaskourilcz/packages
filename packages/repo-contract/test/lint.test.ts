import { describe, expect, it } from "vitest";
import { lintAboutProject, lintNeeded } from "../src/index.js";

const rules = (issues: { rule: string }[]) => issues.map((issue) => issue.rule);

describe("lintNeeded", () => {
  it("accepts a task with a bold title and four valid markers", () => {
    const md = "- [ ] **Connect the domain** — add the DNS records. [imp:5] [owner:me] [time:1h] [kind:deploy]\n";
    expect(lintNeeded(md)).toEqual([]);
  });

  it("reports each missing marker on the task's line", () => {
    const issues = lintNeeded("# NEEDED\n\n- [ ] **Write the docs** [imp:2]\n");
    expect(rules(issues)).toEqual(["missing-owner", "missing-time", "missing-kind"]);
    expect(issues.every((issue) => issue.line === 3)).toBe(true);
  });

  it("reports invalid marker values", () => {
    const md = "- [ ] **Task** [imp:9] [owner:bob] [time:soon] [kind:chore]\n";
    expect(rules(lintNeeded(md))).toEqual(["invalid-imp", "invalid-owner", "invalid-time", "invalid-kind"]);
  });

  it("reads markers from indented continuation lines", () => {
    const md = "- [ ] **Long task** that wraps\n  onto a second line. [imp:3] [owner:ai] [time:30m] [kind:content]\n";
    expect(lintNeeded(md)).toEqual([]);
  });

  it("warns about a missing bold title and skips done items and plain bullets", () => {
    const md = "- [ ] plain title [imp:1] [owner:me] [time:15m] [kind:setup]\n- [x] done\n- just context\n";
    expect(lintNeeded(md).map((issue) => [issue.rule, issue.severity])).toEqual([["bold-title", "warning"]]);
  });
});

describe("lintAboutProject", () => {
  it("passes when the stack section lists tools", () => {
    expect(lintAboutProject("# App\n\n## Tech stack\n\n- **React** — the UI\n")).toEqual([]);
  });

  it("flags a missing section as an error and an empty one as a warning", () => {
    expect(lintAboutProject("# App\n")[0]).toMatchObject({ rule: "missing-stack-section", severity: "error" });
    expect(lintAboutProject("# App\n\n## Tech stack\n\nTBD.\n")[0]).toMatchObject({ rule: "empty-stack", severity: "warning" });
  });
});
