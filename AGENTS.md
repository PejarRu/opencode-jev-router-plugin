# AGENTS.md

`opencode-jev-router-plugin` is an OpenCode v2 plugin published to npm.
Before a prompt is admitted it asks the JEV classifier (router provider's
`systemone` endpoint) six questions and switches the session to the cheapest
likely-capable model; a context hook maps the `effort` answer to the routed
provider's reasoning option. Routing is best-effort: failures are contained
and the prompt is always admitted.

`example/` is the upstream reference copy (gitignored, has its own `.git`).
Never edit it. All tests live in `test/`; `bunfig.toml` pins the Bun test root
to `test/`, so colocated `src/**/*.test.ts` would be silently skipped — keep
tests in `test/`.

## Commands

Bun for tests and installs, Node ≥ 20 for package checks.

```sh
bun install
bun test                          # all tests (test/*.test.ts)
bun test test/router.test.ts      # one file
bun test -t "re-run"              # by name
bun run typecheck                 # tsc --noEmit over src + test
bun run lint                      # Biome; bun run format fixes
bun run build                     # tsc -p tsconfig.build.json + .d.ts import fix
bun run check:package             # publint + attw
bun run smoke                     # npm-install packed tarball, import in Node
```

## Architecture

- `src/index.ts` — only SDK-aware module, `import type` only, single default
  export. Wires `ctx` into the modules below and registers the prompt hook,
  one provider-scoped context hook per effort provider, and `/jev`.
- `router.ts` prompt hook · `effort.ts` context hook · `command.ts` `/jev` ·
  `jev.ts` classifier protocol · `history.ts` previous-turn summary ·
  `decision.ts` resolution + decision storage · `usage.ts` idempotent usage ·
  `display.ts` one-liners and text blocks · `text.ts` token estimates,
  mention stripping · `config.ts` schema, defaults, validation · `auth.ts`
  credential chain · `paths.ts` XDG paths · `logger.ts` leveled logger.
- Tests in `test/`, fakes in `test/support/harness.ts`, decision fixture in
  `test/support/fixtures.ts`.

## Gotchas

- Hooks, the command handler and the logger must never throw.
- Classifier answers are all optional.
- `tsconfig.build.json` uses Node types only: Bun APIs in `src/` break the
  build. Relative imports need `.ts` extensions.
- New option: `PluginConfig` + defaults + validation in `config.ts`, a config
  test, and the README options table.
- Decision is saved before `switchModel`; the effort hook compares
  `StoredDecision.resolved` with the call's model. The router clears `resolved`
  on skipped prompts, a missing provider, and routing failures, so stale effort
  is never applied.
- The router key resolves in order `JEV_ROUTER_API_KEY` → the OpenCode
  integration connection → `auth.json`; the first non-empty value wins.
- Storage keys: `jev/decision/<sessionID>`, `jev/usage/<sessionID>`.
- User-visible changes need a changeset (`bun run changeset`).
- Default log: `~/.local/state/opencode/jev-router.log`, level `warn`.

## Verify

Run `bun test`, `bun run typecheck` and `bun run lint` after changes; also
`bun run build && bun run check:package && bun run smoke` when touching
`package.json`, `tsconfig*.json` or `src/index.ts`. Report the results.
