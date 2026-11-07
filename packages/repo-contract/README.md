# @lukaskourilcz/repo-contract

A small markdown contract that keeps a repository readable for people and for coding agents, with a parser and a linter for it:

- **`NEEDED.md`**: the open action items, one list line each, with markers for importance, owner, time and kind:

  ```markdown
  - [ ] **Connect the production domain** — add the DNS records and the canonical URL. [imp:5] [owner:me] [time:1h] [kind:deploy]
  - [ ] **Refresh the preview video** — run the preview-video skill. [imp:2] [owner:ai] [time:30m] [kind:content]
  ```

  `imp` is 1–5, `owner` is `me` (the person) or `ai` (an agent can do it), `time` is `30`, `30m`, `2h` or `1h30m`, and `kind` is `setup`, `deploy`, `legal`, `content` or `decision`.
- **`about-project.md`**: the stack under `## Tech stack` and `## Third-party libraries`, one bullet per tool written `Name — what it does`. Without those sections the runtime `dependencies` of `package.json` stand in.

An agent starting a session reads `NEEDED.md` for `[owner:ai]` tasks it can pick up, and a dashboard can merge the lists of many repositories into one queue sorted by importance and time.

## Install

```sh
echo "@lukaskourilcz:registry=https://npm.pkg.github.com" >> .npmrc
npm install -D @lukaskourilcz/repo-contract
```

## CLI

```sh
npx repo-contract lint      # check NEEDED.md and about-project.md; exits 1 on errors
npx repo-contract needed    # list the open tasks: importance, owner, minutes, kind, title
npx repo-contract stack     # print the stack and where it came from
npx repo-contract lint ../other-repo --json
```

```text
NEEDED.md:81  error  missing-owner  Add [owner:me|ai].
NEEDED.md:130  warning  bold-title  Start the task with a **bold title**.
```

Run `repo-contract lint` in CI to keep the files in shape.

## Library

```ts
import { lintNeeded, neededTodoItems, readRepoStack, removeNeededLine } from '@lukaskourilcz/repo-contract';

const tasks = neededTodoItems(neededMd);
// [{ key, line, text: 'Connect the production domain — add the DNS records…', importance: 5,
//    assignee: 'me', estimatedMinutes: 60, kind: 'deploy', raw: '- [ ] **Connect…' }]

const forAgents = tasks.filter((task) => task.assignee === 'ai');

// Check a task off by removing its exact line.
const { next, removed } = removeNeededLine(neededMd, tasks[0].raw);

lintNeeded(neededMd);                       // [{ file, line, severity, rule, message }]
readRepoStack({ aboutProject, packageJson }); // { source: 'about-project' | 'package-json' | null, entries }
```

Markers may sit on an indented continuation line of a wrapped task. Ticked items (`- [x]`) are done and skipped. When a file uses checkboxes, plain bullets are treated as context, not tasks.

`mergeDetectedTools` and `partitionDetectedTools` merge the stacks of several repositories into one list of tools, each with the projects that use it (`next` and "Next.js" count as one tool).

## API

| Export | What it does |
| --- | --- |
| `parseNeeded`, `neededTodoItems`, `removeNeededLine`, `assigneeForTodo`, `NEEDED_FILE_PATHS` | NEEDED.md |
| `lintNeeded`, `lintAboutProject` | The contract checks behind `repo-contract lint` |
| `parseAboutProjectStack`, `parsePackageJsonStack`, `readRepoStack` | One repository's stack |
| `mergeDetectedTools`, `partitionDetectedTools`, `toolKey` | Stacks across repositories |
| `TASK_KINDS`, `parseTimeToMinutes`, `formatMinutes`, `TIME_BUCKETS` | Marker vocabularies |

## License

MIT. Extracted from [OwnDashboard](https://github.com/lukaskourilcz/own-dashboard), which merges the `NEEDED.md` of every active repository into one task list.
