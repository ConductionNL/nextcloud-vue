# Proposal: audit-label-action-prefix

## Why

OpenRegister records what an assistant did through MCP as `mcp.<verb>` audit entries, with the tool in `toolId`
(`stackiq.module.search`). An app wants its History tab to read "Assistant: stackiq.module.search" for every such entry.
`actionLabels` matches an action exactly and has no token for the tool, so this needs one key per verb and cannot name
the tool.

## What changes

- An `actionLabels` key may end in `.*`: it covers every action under that prefix (`mcp.*` covers `mcp.search` and
  `mcp.lead.search`). An exact key wins; among wildcards the most specific wins. The prefix alone (`mcp`) is not covered.
- A label may name `{toolId}`, the tool an entry records; empty for an entry without one.

Read by the History card and the timeline (`src/utils/auditLabels.js`). A label without these works as before.
