# opencode-jev-router-plugin

## 0.1.0

### Minor Changes

- First npm release. Compared with the upstream plugin this release ships compiled ESM with type declarations and zero runtime dependencies, validates every option (invalid values fall back to defaults with a logged warning), adds `logLevel`, `onError` and `statusCommand`, resolves the router key from `JEV_ROUTER_API_KEY`, the OpenCode integration connection or `auth.json` (XDG-aware), reuses the stored decision when OpenCode re-runs the prompt hook, applies reasoning effort only to the model the router selected, and adds the `/jev` status command.
  
  Breaking against upstream: `logging` is deprecated in favour of `logLevel`, the default log level is `warn`, and the default log file moved from `/tmp/opencode/jev-router.log` to `$XDG_STATE_HOME/opencode/jev-router.log`.
