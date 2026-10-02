# AGENTS.md

`opencode-jev-router-plugin` is an OpenCode v2 plugin. Before a prompt is
admitted, it asks the JEV classifier (OpenRouter `systemone` endpoint) six
questions and switches the session to the cheapest likely-capable model.
Routing is best-effort: any failure is contained and the prompt is still
admitted.

## Location

The package lives at the repository root. `example/opencode-jev-router-plugin/`
is the read-only upstream reference (gitignored, never edited). All tests live
in `test/` (`bunfig.toml` pins the Bun test root to `test/`, so colocated
`src/**/*.test.ts` would be silently skipped — keep tests in `test/`).

## Commands

```sh
bun install                 # dev deps (lockfile: bun.lock, frozen in CI)
bun test                    # full suite (test/*.test.ts)
bun test test/router.test.ts   # single file
bun test -t "skips short prompts" # single test by name
bun run typecheck           # tsc --noEmit (src + test)
bun run lint                # biome check .
bun run format              # biome check --write .
bun run build               # tsc -p tsconfig.build.json + .d.ts import fix
bun run check:package       # publint + attw
bun run smoke               # scripts/smoke-pack.sh (pack, npm install, Node import)
```

`@opencode/plugin` is pinned to `latest`, so the SDK API can drift.

## Architecture

`src/index.ts` is the only module that imports the OpenCode SDK
(`@opencode/plugin`, `Plugin.define`). It reads real `ctx` state and injects
it into plain functions. Every other module takes its dependencies as an
argument (see `PromptRouterDeps`, `EffortHookDeps`) so it can be tested
without starting OpenCode.

- `router.ts` — prompt-hook flow; deps injected.
- `effort.ts` — context-hook flow: classifier `effort` → provider option.
- `jev.ts` — classifier request/response protocol; pure, injectable `fetch`.
- `history.ts` — previous-turn and context-size summarizer.
- `decision.ts` — tier/confidence resolution + storage keys.
- `display.ts` — TUI one-liner and the machine-readable decision block.
- `text.ts` — token estimates, `@`-mention stripping, previews.
- `testing.ts` — test harness (`FakeStorage`, fake session/fetch).
- `README.md` — accurate user-facing spec (install, options table,
  resolution order, troubleshooting). Keep it in sync when behavior changes.

## Gotchas

- The prompt hook handler must never throw. All routing errors are caught and
  the session falls back to the fallback model; keep that containment.
- Classifier answers are all optional (`JevRoutingResponseAnswers`). Consumers
  must degrade gracefully; never assume an answer field exists.
- Modules outside `index.ts` must not import the OpenCode SDK. Preserve the
  dependency-injection boundary or the unit tests stop working.
- Add a config option in three places together: `PluginConfig`, `DEFAULTS`
  (both in `config.ts`), and the README options table. `normalizeConfig`
  deep-merges user options over `DEFAULTS`.
- The router API key is read directly from
  `~/.local/share/opencode/auth.json` (entry must be `type: "api"`). Routed
  target models use normal OpenCode provider auth.
- Storage keys are `jev/decision/<sessionID>` and `jev/usage/<sessionID>`.
  The effort hook reads the stored decision, so the decision must be saved
  before the next context-hook call.
- Default log file is `/tmp/opencode/jev-router.log`; set `logging: false` to
  silence. Grep it for `routing decision:` lines when debugging.

## Verify

Run `bun test` and `bunx tsc --noEmit` after changes, and report the results.
