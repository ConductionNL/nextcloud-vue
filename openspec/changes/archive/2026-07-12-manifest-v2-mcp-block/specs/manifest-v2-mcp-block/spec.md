# manifest-v2-mcp-block — Specification

## Purpose

Defines an OPTIONAL top-level `mcp` block in the Conduction app manifest v2 JSON Schema (`src/schemas/app-manifest-v2.schema.json`). The block carries **MCP tool visibility/UX hints only** — an app-level exposure default, per-page tool relevance groupings, and agent-facing discovery hints. It grants no access and gates nothing: per ADR-063, OpenRegister's register (`x-openregister-mcp` dialect + `#[McpTool]` attributes) is the single source of CRUD-tool truth and OpenRegister RBAC is the authoritative invoke-time gate. No `nextcloud-vue` renderer consumes the block; it is read later by Hermiq and openbuild surfaces.

**New artifacts introduced by this capability:**
- One optional top-level `mcp` property added to `src/schemas/app-manifest-v2.schema.json`
- A lockstep patch to `hydra/scripts/schemas/app-manifest-v2.schema.json` (executed via a hydra PR — cross-repo)
- Jest golden cases for the `mcp` block
- `docs/architecture/manifest.md` stub update

---

## ADDED Requirements

### Requirement: REQ-MCP-001 — Optional Top-Level `mcp` Block

The v2 schema MUST define an OPTIONAL top-level property `mcp` of type `object`. The property MUST NOT be added to the schema's `required` array; the schema's `required` MUST remain exactly `["$schema", "version"]`. The `mcp` object MUST set `additionalProperties: false` and MUST carry a `title` and a `description` stating that it holds MCP tool visibility/UX hints only, that it is advisory, and that OpenRegister's register + RBAC remain the source of CRUD truth (ADR-063). Every property defined inside `mcp` MUST have a `title` and a `description`.

#### Scenario: v2 manifest without an `mcp` block validates unchanged

- **WHEN** an existing v2 manifest (`$schema` + `version` + any current properties, no `mcp` key) is validated against the v2 schema
- **THEN** validation SHALL pass with no errors, identical to before this change

#### Scenario: `mcp` is not required

- **WHEN** the v2 schema's top-level `required` array is read after this change
- **THEN** it SHALL equal `["$schema", "version"]` and SHALL NOT contain `mcp`

#### Scenario: Unknown property inside `mcp` is rejected

- **WHEN** a manifest contains `"mcp": { "bogusKey": true }`
- **THEN** validation SHALL fail with an error citing `additionalProperties` on the `mcp` block

---

### Requirement: REQ-MCP-002 — App-Level `expose` Hint

The `mcp` block MAY include a boolean property `expose`. It is an advisory app-wide default for whether this app's derived MCP tools should be shown in agent / tool-picker surfaces. It MUST default to `false` (opt-in, matching ADR-063's default-OFF exposure model). Its description MUST state that it is advisory only and that the authoritative gate is OpenRegister RBAC + per-agent whitelists.

#### Scenario: `expose: true` validates

- **WHEN** a manifest contains `"mcp": { "expose": true }`
- **THEN** validation SHALL pass

#### Scenario: Non-boolean `expose` fails

- **WHEN** a manifest contains `"mcp": { "expose": "yes" }`
- **THEN** validation SHALL fail citing the `expose` type

#### Scenario: `expose` defaults to false when omitted

- **WHEN** an Ajv instance compiled with `useDefaults: true` validates `"mcp": {}`
- **THEN** after validation `mcp.expose` SHALL be `false`

---

### Requirement: REQ-MCP-003 — Per-Page Tool Hints (`pageTools`)

The `mcp` block MAY include an object property `pageTools` that maps a `pages[].id` (the v2 page/route id) to an ordered array of MCP tool ids relevant on that page. `pageTools` MUST use `additionalProperties` whose value is an array of strings. Each tool-id string MUST match the pattern `^[a-z0-9_-]+\.[a-zA-Z0-9_-]+\.(search|get|create|update|delete)$` — i.e. `{appId}.{schemaSlug}.{verb}` where the verb is one of the five OpenRegister derived-CRUD verbs (ADR-063). The description MUST state that this is an advisory grouping for UX surfaces, that keys are expected to match `pages[].id`, and that the register remains authoritative for whether a listed tool actually exists.

#### Scenario: `pageTools` mapping a page id to derived tool ids validates

- **WHEN** a manifest contains `"mcp": { "pageTools": { "leads-index": ["pipelinq.lead.search", "pipelinq.lead.get"] } }`
- **THEN** validation SHALL pass

#### Scenario: A tool id with an unknown verb fails

- **WHEN** a `pageTools` array contains `"pipelinq.lead.frobnicate"`
- **THEN** validation SHALL fail citing the tool-id pattern

#### Scenario: A tool id missing the appId namespace fails

- **WHEN** a `pageTools` array contains `"lead.search"` (no `{appId}.` prefix)
- **THEN** validation SHALL fail citing the tool-id pattern

#### Scenario: A non-array `pageTools` entry fails

- **WHEN** a manifest contains `"mcp": { "pageTools": { "leads-index": "pipelinq.lead.search" } }`
- **THEN** validation SHALL fail citing the array type on the `pageTools` value

---

### Requirement: REQ-MCP-004 — Agent-Facing Hints (`agentHints`)

The `mcp` block MAY include an object property `agentHints` carrying advisory metadata for agent surfaces. It MUST define at least these titled + described properties:
- `summary` (string) — one-line description of what the app's tools help an agent accomplish
- `defaultTools` (array of strings) — MCP tool ids to surface first / preselect when an agent has no page context
- `keywords` (array of strings) — discovery keywords for progressive-disclosure / tool-search ranking (Hermiq)

`agentHints` MUST set `additionalProperties: true` so future advisory hints can be added by consuming surfaces without a schema release (forward compatibility). Its description MUST state that all values are advisory and non-authoritative.

#### Scenario: A full `agentHints` object validates

- **WHEN** a manifest contains `"mcp": { "agentHints": { "summary": "Manage sales leads and tickets", "defaultTools": ["pipelinq.lead.search"], "keywords": ["crm", "sales", "leads"] } }`
- **THEN** validation SHALL pass

#### Scenario: An unrecognised advisory hint inside `agentHints` is tolerated

- **WHEN** a manifest contains `"mcp": { "agentHints": { "summary": "…", "experimentalRanking": 0.9 } }`
- **THEN** validation SHALL pass (`agentHints` allows additional properties for forward compatibility)

#### Scenario: A non-string `summary` fails

- **WHEN** a manifest contains `"mcp": { "agentHints": { "summary": 42 } }`
- **THEN** validation SHALL fail citing the `summary` type

---

### Requirement: REQ-MCP-005 — Additive, Non-Breaking, No Renderer Consumption

The change MUST be additive only. No existing top-level property, `$defs` definition, or `required` entry may be modified. `nextcloud-vue` MUST NOT read, render, or otherwise consume the `mcp` block as part of this change; consumption is deferred to Hermiq / openbuild surfaces in separately-specced work. The `validateManifest()` / `validateManifestV2()` export MUST continue to accept manifests both with and without the `mcp` block.

#### Scenario: Every pre-existing v2 golden manifest still validates

- **WHEN** the pre-change v2 golden fixtures are re-validated after this change
- **THEN** each SHALL return the same pass/fail result as before

#### Scenario: No renderer reads the block

- **WHEN** the `nextcloud-vue` source is searched for reads of `manifest.mcp`
- **THEN** no renderer, composable, or component SHALL reference it (the block is inert in this library)

---

### Requirement: REQ-MCP-006 — Hydra Canonical Copy Lockstep

Because the ADR-036 / gate-22 manifest validation runs against the hydra canonical schema (`hydra/scripts/schemas/app-manifest-v2.schema.json`), which is `additionalProperties: false`, the identical `mcp` block MUST be added to the hydra canonical copy so a manifest declaring `mcp` passes gate-22. This lockstep patch is executed via a **separate hydra PR** (cross-repo — not landed in this `nextcloud-vue` change). This change MUST NOT reconcile the six pre-existing drift properties (`adminSettings`, `credentials`, `schedules`, `pageTemplates`, `pageInstances`, `sets`) present only in the nc-vue copy; that debt is out of scope.

#### Scenario: A manifest declaring `mcp` fails gate-22 until the hydra copy is patched

- **WHEN** a manifest declaring an `mcp` block is validated against the un-patched hydra canonical schema
- **THEN** validation SHALL fail on `additionalProperties` — documenting why the hydra lockstep PR is required before any app ships an `mcp` block

#### Scenario: Both copies define an identical `mcp` block after the lockstep PR merges

- **WHEN** the `mcp` sub-schema in the nc-vue copy and the hydra copy are compared after both patches land
- **THEN** they SHALL be structurally identical (same properties, types, patterns, defaults, `additionalProperties` postures)
