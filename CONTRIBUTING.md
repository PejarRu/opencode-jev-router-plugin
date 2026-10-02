# Contributing

## Setup

Bun runs the tests and installs dependencies; Node ≥ 20 runs the package
checks.

```sh
bun install
bun test && bun run typecheck && bun run lint
```

Before opening a pull request, also run:

```sh
bun run build && bun run check:package && bun run smoke
```

CI runs the same commands.

## Rules

- `src/index.ts` is the only module that references `@opencode/plugin`, and
  only through `import type`. Everything else receives its dependencies as
  arguments (`PromptRouterDeps`, `EffortHookDeps`, the status command deps),
  so it is testable without OpenCode and the package keeps zero runtime
  dependencies.
- `src/index.ts` has a single runtime export, the default plugin object.
- The prompt hook, the context hook, the `/jev` handler and the logger never
  throw. Contain errors and log them.
- Classifier answers are optional. Code must work when any answer is missing.
- A new option is added to `PluginConfig`, the defaults and validation in
  `normalizeConfig` (all in `src/config.ts`), a test in
  `test/config.test.ts`, and the options table in `README.md`.
- Relative imports use the `.ts` extension.
- Tests live in `test/`, one file per module; shared fakes are in
  `test/support/`. Do not put test helpers in `src/`; it ships.
- No `biome-ignore`, `@ts-ignore` or skipped tests.

## Changesets

Every user-visible change needs a changeset:

```sh
bun run changeset
```

Pick `patch`, `minor` or `major` and describe the change for users. Merging
to `main` opens or updates the "chore: release" pull request; merging that
pull request publishes to npm with provenance.
