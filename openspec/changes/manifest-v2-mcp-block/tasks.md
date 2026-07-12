# Tasks: manifest-v2-mcp-block

## 1. Schema addition (nc-vue copy)

- [ ] 1.1 In `src/schemas/app-manifest-v2.schema.json`, add the optional top-level `mcp` property exactly as specified in `design.md` ("Exact proposed `mcp` block schema"): `expose` (boolean, default false), `pageTools` (object → arrays of tool-id strings with the `^[a-z0-9_-]+\.[a-zA-Z0-9_-]+\.(search|get|create|update|delete)$` pattern), `agentHints` (`summary`, `defaultTools`, `keywords`; `additionalProperties: true`). Set `additionalProperties: false` on `mcp`. Every property MUST have `title` + `description`.
  - spec_ref: REQ-MCP-001, REQ-MCP-002, REQ-MCP-003, REQ-MCP-004
  - files_likely_affected: `src/schemas/app-manifest-v2.schema.json`
- [ ] 1.2 Confirm the top-level `required` array is still exactly `["$schema", "version"]` and no existing property or `$defs` entry was modified (additive-only).
  - spec_ref: REQ-MCP-001, REQ-MCP-005
  - files_likely_affected: `src/schemas/app-manifest-v2.schema.json`

## 2. Validator + docs

- [ ] 2.1 Confirm `src/utils/validateManifest.js` compiles the v2 schema with `useDefaults: true` so `mcp.expose` defaults to `false`; add no consumption logic — the block stays inert (no read of `manifest.mcp` anywhere in `src/`).
  - spec_ref: REQ-MCP-002, REQ-MCP-005
  - files_likely_affected: `src/utils/validateManifest.js`
- [ ] 2.2 Add an "MCP visibility hints" subsection to `docs/architecture/manifest.md`: document `mcp` as advisory-only, reference ADR-063, state the register + RBAC are CRUD-authoritative, and give the `{appId}.{schemaSlug}.{verb}` tool-id shape.
  - spec_ref: REQ-MCP-001, REQ-MCP-005
  - files_likely_affected: `docs/architecture/manifest.md`

## 3. Tests

- [ ] 3.1 Add `tests/schemas/app-manifest-v2.mcpBlock.spec.js` golden cases: full `mcp` block validates; no-`mcp` manifest validates; `expose` defaults to `false`; valid vs. bad-verb / missing-appId / non-array `pageTools`; `agentHints` extra key tolerated, non-string `summary` fails; unknown key under `mcp` fails.
  - spec_ref: REQ-MCP-001..REQ-MCP-005
  - files_likely_affected: `tests/schemas/app-manifest-v2.mcpBlock.spec.js`
- [ ] 3.2 Run existing v2 golden fixtures through the validator and confirm no regression (REQ-MCP-005).
  - spec_ref: REQ-MCP-005
  - files_likely_affected: `tests/schemas/`

## 4. Hydra lockstep (cross-repo — task only, NOT executed here)

- [ ] 4.1 File a hydra PR adding the identical `mcp` sub-schema to `hydra/scripts/schemas/app-manifest-v2.schema.json` so gate-22 accepts manifests declaring `mcp`. Do NOT reconcile the six pre-existing drift properties (`adminSettings`, `credentials`, `schedules`, `pageTemplates`, `pageInstances`, `sets`). Link the hydra PR back to this change.
  - spec_ref: REQ-MCP-006
  - files_likely_affected: (hydra repo) `hydra/scripts/schemas/app-manifest-v2.schema.json`

## 5. Verification

- [ ] 5.1 Run `npm run lint`, `npm run test`, and `npm run build`; confirm all pass and no existing tests regress.
  - spec_ref: REQ-MCP-005
  - files_likely_affected: (none)
- [ ] 5.2 Run `openspec validate manifest-v2-mcp-block --type change --strict` and confirm all 4 artifacts pass.
  - spec_ref: (all)
  - files_likely_affected: (none)

## Acceptance criteria

- The `mcp` block is optional, additive, and `additionalProperties: false`; existing manifests validate unchanged.
- Every `mcp` property carries `title` + `description`; tool ids are pattern-validated to `{appId}.{schemaSlug}.{verb}`.
- Nothing in `nextcloud-vue` reads `manifest.mcp` (renderer consumption is out of scope, deferred to Hermiq/openbuild).
- The hydra lockstep is captured as a cross-repo task, not landed in this change.

## Quality checklist (reminders, not checkboxes)

- Unit tests added with the existing Jest schema-test harness.
- JSDoc / docs updated (`docs/architecture/manifest.md`).
- No CSS/component changes; no theming impact.
