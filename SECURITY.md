# Security policy

## Reporting

Report vulnerabilities through GitHub private vulnerability reporting:
<https://github.com/emmdim/opencode-jev-router-plugin/security/advisories/new>.
Do not open a public issue. Expect an acknowledgement within 7 days.

Only the latest published version receives fixes.

## Data handling

- Before each admitted prompt that passes the skip rules, the plugin sends the
  prompt text (mentions removed); for mentioned files, their display name or
  `file:` URI / absolute path (`file.name ?? file.uri`) and byte-size estimate;
  for mentioned skills, their ID, description and token estimate; the project
  directory; and, when a previous completed turn exists, that turn's data:
  the previous user text preview, the previous-turn file list, and assistant
  metadata (model, agent, finish reason, cost, tool count, text preview and
  token breakdown). File contents are not read or sent. Disable
  `previousContext` to stop sending previous-turn data; set `enabled: false`
  to stop sending anything.
- The router API key is read from `JEV_ROUTER_API_KEY`, the OpenCode
  integration connection, or `auth.json`, and is sent only to the router
  provider's `systemone` endpoint. It is never logged or stored by the plugin.
- At `logLevel: "debug"` the log file contains prompt text and previews. The
  file is created with mode `0600` in a `0700` directory (the directory is
  created with `0700` only when the plugin creates it).
- Releases are published from GitHub Actions with npm trusted publishing and
  provenance. Verify with `npm audit signatures`.
