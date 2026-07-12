# Design: manifest-v2-mcp-block

## Context

ADR-063 makes the OpenRegister **register** the single source of MCP CRUD-tool truth (`x-openregister-mcp` dialect + `#[McpTool]` attributes) and OpenRegister **RBAC** the authoritative invoke-time gate. The app **manifest** owns presentation. This change adds a thin, optional presentation layer — an `mcp` block — so an app can declare *which* of its (register-derived) tools are contextually relevant *where*, without duplicating or overriding any CRUD authority.

Grounding in the existing v2 schema (verified at HEAD 2026-07-12):
- Pages are addressed by `pages[].id` (a unique vue-router route name; sentinels not allowed). `pageTools` keys reuse that identifier.
- Schemas are referenced elsewhere in the manifest by **slug** (`dataSource.schema`, `objectTableSource.schema`). Derived tool ids therefore follow the register's `{appId}.{schemaSlug}.{verb}` shape (ADR-063), reusing the slug the app already writes.
- The top-level schema is `additionalProperties: false` with `required: ["$schema", "version"]`. The block is added as one more optional sibling property — no `required` change.

## Goals

- One optional, additive top-level `mcp` object; existing manifests validate unchanged.
- Small and forward-compatible: three properties (`expose`, `pageTools`, `agentHints`); `agentHints` is open for future advisory keys.
- Every property titled + described in the JSON schema.
- Make it structurally obvious the block is **advisory** (descriptions repeatedly point at the register + RBAC as authority).

## Non-Goals

- **No renderer / consumption in `nextcloud-vue`.** The block is inert here; Hermiq (agent tool picker, per-agent scoping, progressive disclosure) and openbuild (tool browser) read it in later, separately-specced work.
- **No CRUD authority.** The block cannot create, expose, or gate a tool. If a listed tool id does not exist in the register, or RBAC forbids it, the surface simply does not show / cannot invoke it.
- **No reconciliation of the six pre-existing drift properties** between the nc-vue and hydra copies (see below) — that is separate debt.

## Schema Drift (hydra canonical ↔ nc-vue copy) — verified at HEAD 2026-07-12

Both copies: `required: ["$schema", "version"]`, `additionalProperties: false`, identical `$id`/`title`.

- **Shared baseline (12):** `$schema, version, openbuildEditable, dependencies, setup, walkthrough, nav, runtime, menu, pages, observability, deepLinks`.
- **Present ONLY in nc-vue copy (6):** `adminSettings, credentials, schedules, pageTemplates, pageInstances, sets`. The nc-vue copy is 2311 lines vs. hydra's 1331 — nc-vue is ahead.

**Consequence for this change:** because both copies are `additionalProperties: false`, the `mcp` property MUST be added to **both** copies or a manifest using it validates in nc-vue but is rejected by gate-22 (hydra copy). This change lands `mcp` in nc-vue and files the identical hydra patch as a lockstep task (executed via a hydra PR). It deliberately leaves the six drift properties untouched so the drift is neither widened nor silently "fixed" under cover of an unrelated change.

## Declarative-vs-imperative decision (ADR-031)

The change is a **declarative** JSON-schema addition — no lifecycle / aggregation / calculation / notification / relation / widget behaviour, no service class. `kind: config`. The `mcp` hints are themselves a *declarative* companion to the register's `x-openregister-mcp` dialect; they add no imperative surface.

## Exact proposed `mcp` block schema

Added as one entry under the v2 schema's top-level `properties` (siblings unchanged; `required` unchanged). Placeholder values are obvious (`{appId}`, `<pageId>`, `pipelinq.lead.search` as an illustrative-only example).

```json
"mcp": {
  "type": "object",
  "title": "MCP tool visibility hints",
  "description": "OPTIONAL. Advisory visibility/UX hints for MCP tool surfaces (Hermiq agent tool picker, openbuild tool browser). Purely presentational: per ADR-063, OpenRegister's register (x-openregister-mcp dialect + #[McpTool] attributes) is the single source of CRUD-tool truth and OpenRegister RBAC is the authoritative invoke-time gate. This block grants no access and gates nothing; nothing in nextcloud-vue consumes it.",
  "additionalProperties": false,
  "properties": {
    "expose": {
      "type": "boolean",
      "title": "App-level exposure hint",
      "description": "Advisory app-wide default for whether this app's register-derived MCP tools should be shown in agent / tool-picker surfaces. Advisory only — the authoritative gate is OpenRegister RBAC plus per-agent whitelists. Defaults to false (opt-in), matching ADR-063's default-OFF exposure model.",
      "default": false
    },
    "pageTools": {
      "type": "object",
      "title": "Per-page tool hints",
      "description": "Maps a pages[].id to the ordered list of MCP tool ids that are contextually relevant on that page. Advisory grouping for UX surfaces only; it does not grant access. Keys are expected to match an existing pages[].id; the register remains authoritative for whether each listed tool actually exists.",
      "additionalProperties": {
        "type": "array",
        "title": "Relevant tool ids for a page",
        "description": "Ordered MCP tool ids relevant to the page keyed above. Advisory ordering only.",
        "items": {
          "type": "string",
          "title": "MCP tool id",
          "description": "A fully-qualified MCP tool id in the register's derived-CRUD shape {appId}.{schemaSlug}.{verb}, verb one of search|get|create|update|delete (ADR-063). Example only: \"pipelinq.lead.search\". The register is authoritative for existence; this is a hint.",
          "pattern": "^[a-z0-9_-]+\\.[a-zA-Z0-9_-]+\\.(search|get|create|update|delete)$"
        }
      }
    },
    "agentHints": {
      "type": "object",
      "title": "Agent-facing hints",
      "description": "Advisory metadata for agent surfaces (Hermiq). All values are non-authoritative UX hints. Additional properties are permitted so consuming surfaces can introduce new advisory hints without a schema release (forward compatibility).",
      "additionalProperties": true,
      "properties": {
        "summary": {
          "type": "string",
          "title": "App tool summary",
          "description": "One-line description of what this app's tools help an agent accomplish. Shown in agent / tool-picker surfaces."
        },
        "defaultTools": {
          "type": "array",
          "title": "Default tool ids",
          "description": "MCP tool ids to surface first / preselect when an agent has no page context. Advisory ordering hint only; not a grant.",
          "items": {
            "type": "string",
            "title": "MCP tool id",
            "description": "Fully-qualified MCP tool id {appId}.{schemaSlug}.{verb}. Example only: \"pipelinq.lead.search\"."
          }
        },
        "keywords": {
          "type": "array",
          "title": "Discovery keywords",
          "description": "Keywords helping progressive-disclosure / tool-search surfaces (Hermiq) rank this app's tools. Advisory only.",
          "items": {
            "type": "string",
            "title": "Keyword",
            "description": "A single discovery keyword."
          }
        }
      }
    }
  }
}
```

### Design rationale

- **`expose` boolean, default false** — mirrors ADR-063 default-OFF; an app opts its whole tool set into pickers with a single flag, still subject to RBAC.
- **`pageTools` keyed by `pages[].id`** — reuses the identifier pages already carry, so the hint is co-located with the page it describes. Values are tool-id arrays, ordered (agents get a sensible default order per page).
- **Tool-id `pattern`** — enforces the `{appId}.{schemaSlug}.{verb}` shape and the closed five-verb set from ADR-063, catching typos at manifest-validation time. It intentionally does **not** verify existence (that is the register's job) — the pattern is a shape guard, not an authority check.
- **`agentHints.additionalProperties: true`** — the one deliberately open object, for forward compatibility (e.g. a future `experimentalRanking`); the surrounding `mcp` block and `pageTools` stay strict (`additionalProperties: false` / typed) so typos in the load-bearing parts fail loudly.
- **Descriptions repeat the authority statement** — every level restates "advisory / register + RBAC authoritative" so a manifest author reading the schema cannot mistake a hint for a grant.

## Seed Data

Not applicable. This change edits a JSON Schema in `nextcloud-vue`; it introduces or modifies no OpenRegister schemas and therefore adds no `_registers.json` seed objects.

## Test Strategy

Jest golden cases (positive + negative) against the compiled v2 validator:
- Full `mcp` block (all three properties populated) validates.
- Manifest with no `mcp` block validates (back-compat).
- `expose` defaults to `false` under `useDefaults: true`.
- `pageTools` with a valid `{appId}.{schema}.{verb}` id validates; unknown verb and missing-appId ids fail; non-array value fails.
- `agentHints` with an extra advisory key validates; non-string `summary` fails.
- Unknown property directly under `mcp` fails (`additionalProperties: false`).

## Cross-repo note (hydra lockstep)

The identical `mcp` sub-schema must be added to `hydra/scripts/schemas/app-manifest-v2.schema.json` via a hydra PR before any app ships an `mcp` block, or gate-22 rejects it. Tracked as a task here; the actual hydra edit + PR is executed in the hydra repo, not this change.
