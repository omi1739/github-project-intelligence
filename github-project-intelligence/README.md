# GitHub Project Intelligence (GPI)

A Chrome extension (Manifest V3) that turns any GitHub repository into an understandable technical
report: technology stack, project structure, repository health, activity, testing, dependencies,
code-quality and security signals — with an optional AI assistant that explains the results.

Built exactly to the roadmap in `Github Extenction.pdf`:

- **V1** — repo detection, Analyze button, GitHub API integration, overview, language/framework
  detection, structure, README analysis, activity, health score, local caching, loading/error states
- **V2** — dependency, testing, CI/CD, security, code-quality and architecture-inference analyzers
- **V4** — pluggable AI layer (OpenAI / Anthropic / Ollama / OpenAI-compatible) with secret redaction

No backend, no database, no Docker. V1+V2 run entirely inside the browser.

## Load it in Chrome / Edge / Brave

```bash
npm install
npm run build
```

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder
4. Pin the extension, then open any repository (e.g. `github.com/facebook/react`)
5. Click the green **Analyze Repository** button on the page — or the toolbar icon to open the side
   panel

During development run `npm run dev` (vite build --watch) and press the reload button on
`chrome://extensions/` after changes.

## Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Rebuild on change                              |
| `npm run build`     | Production build into `dist/`                  |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm test`          | Vitest unit tests for the analysis engine      |
| `npm run lint`      | ESLint (flat config)                           |
| `npm run format`    | Prettier                                       |
| `npm run verify`    | typecheck + test + lint + build                |

## Architecture

```
src/
├── manifest.json                 # MV3 manifest (transformed by CRXJS)
├── background/service-worker.ts  # side panel behavior + open-panel messaging
├── content/github-detector.ts    # detects repo pages, injects Analyze button (SPA-safe)
├── sidepanel/                    # React side panel: 9 report tabs + AI assistant
├── options/                      # GitHub token, cache TTL, AI provider settings
├── services/
│   ├── github.ts                 # GitHub REST collector (repo, tree, activity, raw files)
│   ├── analysis.ts               # pipeline: collect -> analyze -> health -> cache
│   ├── storage.ts                # chrome.storage.local settings + TTL cache
│   └── ai.ts                     # AIService: OpenAI / Anthropic / Ollama / custom
├── analyzers/                    # modular, unit-tested analysis engine
│   ├── stack.ts                  # technology detection (deps + file rules)
│   ├── structure.ts              # groups, architecture inference, "start here" files
│   ├── dependencies.ts           # prod/dev dependency parsing, lockfile/package manager
│   ├── testing.ts                # frameworks, test files, CI signals
│   ├── security.ts               # .env, .gitignore, local secret-like scan
│   ├── activity.ts               # commits, contributors, releases, overview status
│   ├── quality.ts                # large files, TODO/FIXME, recommendations
│   ├── readme.ts                 # sections, install instructions, summary
│   ├── health.ts                 # 6 weighted categories + overall score + explanations
│   └── index.ts                  # buildReport()
└── models/types.ts               # shared report types (evidence + confidence everywhere)
```

### Design rules from the spec

- **Evidence-based**: every technology and architecture claim carries evidence paths and a
  confidence level (`high` / `medium` / `low`). Architecture is reported as *"Inferred
  architecture"*, never as a guarantee.
- **Deterministic engine first**: the report is computed locally with plain heuristics. AI is an
  optional layer that receives a redacted digest of the report — not the raw repository.
- **Secrets stay local**: secret-like patterns are detected and redacted in the browser before
  display or before any AI call. Nothing is uploaded automatically.
- **Measurable health score**: Documentation, Testing, Maintenance, Organization, CI/CD and
  Dependencies, each with an explanation of how it was computed.
- **Rate-limit friendly**: GitHub API usage is ~8 requests per analysis (metadata, tree, activity);
  README/manifest/source samples come from `raw.githubusercontent.com`. Reports are cached in
  `chrome.storage.local` (TTL configurable, default 30 min).

## GitHub token (recommended)

Unauthenticated GitHub API: 60 requests/hour. With a read-only fine-grained token: 5,000/hour.
Add it under **Options → GitHub API**. It is stored only in `chrome.storage.local`.

## AI assistant (V4)

Enable a provider under **Options → AI provider**:

- **OpenAI / Anthropic** — API key + optional custom base URL
- **Ollama** — local models, no key needed (e.g. `http://localhost:11434`)
- **Custom** — any OpenAI-compatible endpoint

The assistant answers questions ("How does authentication work?", "What should I learn first?")
using the analysis report as context.

## Testing

26 unit tests cover the analysis engine: stack detection, structure/architecture inference,
health scoring, testing detection, dependency parsing, security signals, README intelligence,
redaction, URL parsing and the end-to-end `buildReport()` pipeline.

## Roadmap (not built yet)

- Private repository support (token already wired)
- Registry integration for outdated-dependency checks
- Report export (Markdown/PDF)
- Architecture graphs and full static analysis
- Team onboarding mode
