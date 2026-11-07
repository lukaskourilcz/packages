#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { lintAboutProject, lintNeeded, type LintIssue } from "./lint.js";
import { NEEDED_FILE_PATHS, neededTodoItems } from "./needed.js";
import { readRepoStack } from "./stack.js";

const USAGE = `Usage: repo-contract <command> [dir] [--json]

Commands:
  lint     Check NEEDED.md tasks and the about-project.md stack section
  needed   List the open NEEDED.md tasks
  stack    Print the stack from about-project.md, or package.json as a fallback
`;

function read(dir: string, file: string): string | null {
  const full = path.join(dir, file);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

function findNeeded(dir: string): { file: string; content: string } | null {
  for (const file of NEEDED_FILE_PATHS) {
    const content = read(dir, file);
    if (content !== null) return { file, content };
  }
  return null;
}

function main(argv: string[]): number {
  const json = argv.includes("--json");
  const [command, dirArg] = argv.filter((a) => a !== "--json");
  const dir = path.resolve(dirArg ?? ".");
  const print = (value: unknown, text: () => string) => console.log(json ? JSON.stringify(value, null, 2) : text());

  switch (command) {
    case "lint": {
      const issues: LintIssue[] = [];
      const needed = findNeeded(dir);
      if (needed) issues.push(...lintNeeded(needed.content, needed.file));
      else issues.push({ file: "NEEDED.md", line: null, severity: "warning", rule: "missing-file", message: "No NEEDED.md or docs/NEEDED.md." });
      const about = read(dir, "about-project.md");
      if (about !== null) issues.push(...lintAboutProject(about));
      else issues.push({ file: "about-project.md", line: null, severity: "warning", rule: "missing-file", message: "No about-project.md." });
      print(issues, () =>
        issues.length === 0
          ? "repo-contract: no issues"
          : issues.map((i) => `${i.file}${i.line ? `:${i.line}` : ""}  ${i.severity}  ${i.rule}  ${i.message}`).join("\n"),
      );
      return issues.some((i) => i.severity === "error") ? 1 : 0;
    }
    case "needed": {
      const needed = findNeeded(dir);
      const items = needed ? neededTodoItems(needed.content) : [];
      print(items, () =>
        items.map((i) => `${i.importance ?? "-"}  ${(i.assignee ?? "-").padEnd(2)}  ${i.estimatedMinutes ?? "-"}m  ${i.kind ?? "-"}  ${i.text}`).join("\n") || "No open tasks.",
      );
      return 0;
    }
    case "stack": {
      const stack = readRepoStack({ aboutProject: read(dir, "about-project.md"), packageJson: read(dir, "package.json") });
      print(stack, () =>
        stack.entries.length === 0
          ? "No stack found."
          : [`source: ${stack.source}`, ...stack.entries.map((e) => `${e.name}${e.whatItDoes ? ` — ${e.whatItDoes}` : ""}`)].join("\n"),
      );
      return 0;
    }
    default:
      console.log(USAGE);
      return command ? 2 : 0;
  }
}

process.exitCode = main(process.argv.slice(2));
