---
kind: config
---

# Proposal: manifest-v2-mcp-block

## Why

ADR-063 (MCP as Platform Abstraction, 2026-07-12) makes OpenRegister the single MCP registry + server and Hermiq the sole agent consumer. Apps no longer ship their own MCP tool code: CRUD tools are **derived** from each schema's `x-openregister-mcp` dialect declaration, and non-CRUD behaviour is declared with a net-new `#[McpTool]` PHP attribute. The register is therefore the **single source of truth** for which tools exist, their input/output schemas, and — via OpenRegister RBAC — who may invoke them.

What the register does **not** know is the app's own UX intent: which page an agent tool is contextually relevant on, whether the app wants its derived tools shown by default in agent/tool-picker surfaces, and what one-line summary or discovery keywords should rank the app in a progressive-disclosure catalog. Those are **presentation hints** that belong with the app manifest, next to the pages they describe — not in the CRUD-authority register.

This change adds an **optional, additive** top-level `mcp` block to the v2 app manifest schema. It carries **visibility/UX hints only**. It grants nothing, gates nothing, and CRUD truth stays in the register (ADR-063). No renderer in `nextcloud-vue` consumes the block today — it is read later by Hermiq (agent tool picker, per-agent scoping) and openbuild (tool browser) surfaces. Renderer/consumption work is explicitly **out of scope** here.

**Dependency**: Hydra ADR-063 is the upstream decision record. This spec implements the `nextcloud-vue` side of that ADR. It reuses the schema-slug and page-id conventions already established by ADR-036 (manifest v2).

## What Changes

- **Additive edit** `src/schemas/app-manifest-v2.schema.json` — add one OPTIONAL top-level property `mcp` (object). Every property inside it is titled + described. No existing property is touched; `required` stays `["$schema", "version"]`; existing manifests validate unchanged.
- **Lockstep edit (cross-repo, NOT done here)** `hydra/scripts/schemas/app-manifest-v2.schema.json` — the ADR-036 / gate-22 manifest validation gate runs against the **hydra canonical copy**, which is a strict `additionalProperties: false` schema. A manifest that declares `mcp` will FAIL gate-22 until the hydra copy also carries the property. The lockstep patch MUST land via a hydra PR (tracked as a task here, executed there). See "Schema drift" below.
- **Tests** — Jest golden cases: a manifest with a full `mcp` block validates; a manifest with an unknown property inside `mcp` fails (`additionalProperties: false` on the block); existing v2 manifests without `mcp` still validate.
- **Docs stub** `docs/architecture/manifest.md` — document the `mcp` block as advisory hints, pointing at ADR-063 and stating the register is CRUD-authoritative.

### Schema drift (hydra canonical ↔ nc-vue copy) — verified at HEAD 2026-07-12

The two copies have already drifted and this change **must not worsen** it. Both share identical top-level required (`["$schema", "version"]`) and both set `additionalProperties: false`. The nc-vue copy (2311 lines) is **ahead** of the hydra copy (1331 lines) by **six** top-level properties that hydra lacks entirely:

| Top-level property | nc-vue copy | hydra canonical | Note |
|---|---|---|---|
| `$schema`, `version`, `openbuildEditable`, `dependencies`, `setup`, `walkthrough`, `nav`, `runtime`, `menu`, `pages`, `observability`, `deepLinks` | present | present | shared baseline (12) |
| `adminSettings` | present | **absent** | nc-vue ahead |
| `credentials` | present | **absent** | nc-vue ahead |
| `schedules` | present | **absent** | nc-vue ahead |
| `pageTemplates` | present | **absent** | nc-vue ahead |
| `pageInstances` | present | **absent** | nc-vue ahead |
| `sets` | present | **absent** | nc-vue ahead |

Because **both** copies are `additionalProperties: false`, the `mcp` property MUST be added to **both** or a manifest that uses it validates in nc-vue but is rejected by gate-22 (hydra copy). This change lands `mcp` in the nc-vue copy and files the lockstep hydra patch as a task. It does **not** attempt to reconcile the six pre-existing drift properties — that is separate debt, out of scope, and flagged here so it is not silently widened.

## Capabilities

### New Capabilities

- `manifest-v2-mcp-block`: optional top-level `mcp` block in the v2 manifest schema carrying MCP tool visibility/UX hints (`expose`, `pageTools`, `agentHints`); advisory only, register-authoritative CRUD unchanged.

### Modified Capabilities

(none — no existing manifest property changes; the addition is purely additive and optional.)

## Impact

- **`src/schemas/app-manifest-v2.schema.json`** — one new optional top-level property; zero changes to existing properties or `required`.
- **`hydra/scripts/schemas/app-manifest-v2.schema.json`** — lockstep property addition, executed via a separate hydra PR (task only here).
- **`docs/architecture/manifest.md`** — docs stub; no API change.
- **`tests/`** — new golden cases; no existing tests change.
- **Consumers** (OpenRegister, OpenCatalogi, Procest, Pipelinq, LaunchPad) — zero impact. Manifests without `mcp` validate unchanged; `mcp` is opt-in.
- **Renderer** — none. `nextcloud-vue` does not read the block; Hermiq/openbuild consume it in later, separately-specced work.
- **Theming** — none (no components, no CSS).
