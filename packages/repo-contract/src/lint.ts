import { parseNeeded } from "./needed.js";
import { parseAboutProjectStack } from "./stack.js";

export type LintSeverity = "error" | "warning";

export type LintIssue = {
  file: string;
  /** 1-based line, or null for a whole-file issue. */
  line: number | null;
  severity: LintSeverity;
  rule: string;
  message: string;
};

const CHECKBOX_RE = /^\s*(?:[-*+]|\d+\.)\s+\[ \]\s+/;
const MARKERS = {
  imp: { re: /\[imp:([^\]]*)\]/i, valid: /^[1-5]$/, hint: "[imp:1-5]" },
  owner: { re: /\[owner:([^\]]*)\]/i, valid: /^(me|ai)$/i, hint: "[owner:me|ai]" },
  time: { re: /\[time:([^\]]*)\]/i, valid: /^\s*(\d+|(\d+\s*h)?\s*(\d+\s*m)?)\s*$/i, hint: "[time:30m]" },
  kind: { re: /\[kind:([^\]]*)\]/i, valid: /^(setup|deploy|legal|content|decision)$/i, hint: "[kind:setup|deploy|legal|content|decision]" },
} as const;

/**
 * Check every open `- [ ]` task in a NEEDED.md against the contract: a bold
 * title, and the four markers with valid values. Ticked items and plain list
 * items without a checkbox are not tasks and are not checked.
 */
export function lintNeeded(content: string, file = "NEEDED.md"): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split(/\r?\n/);
  for (const item of parseNeeded(content)) {
    if (!CHECKBOX_RE.test(item.raw)) continue;
    // Markers may sit on indented continuation lines, so read the whole item.
    const block = [item.raw];
    for (let j = item.line; j < lines.length; j++) {
      const next = lines[j]!;
      if (!/^\s+\S/.test(next) || CHECKBOX_RE.test(next)) break;
      block.push(next);
    }
    const text = block.join(" ");
    if (!/\*\*[^*]+\*\*/.test(item.raw)) {
      issues.push({ file, line: item.line, severity: "warning", rule: "bold-title", message: "Start the task with a **bold title**." });
    }
    for (const [name, marker] of Object.entries(MARKERS)) {
      const found = marker.re.exec(text);
      if (!found) {
        issues.push({ file, line: item.line, severity: "error", rule: `missing-${name}`, message: `Add ${marker.hint}.` });
      } else if (!marker.valid.test(found[1] ?? "") || (name === "time" && !/\d/.test(found[1] ?? ""))) {
        issues.push({ file, line: item.line, severity: "error", rule: `invalid-${name}`, message: `"${found[0]}" is not valid; expected ${marker.hint}.` });
      }
    }
  }
  return issues;
}

/** Check that about-project.md lists the stack under `## Tech stack` or `## Third-party libraries`. */
export function lintAboutProject(content: string, file = "about-project.md"): LintIssue[] {
  const stack = parseAboutProjectStack(content);
  if (!stack.hasSections) {
    return [{ file, line: null, severity: "error", rule: "missing-stack-section", message: "Add a `## Tech stack` section." }];
  }
  if (stack.entries.length === 0) {
    return [{ file, line: null, severity: "warning", rule: "empty-stack", message: "List the stack as bullets written `Name — what it does`." }];
  }
  return [];
}
