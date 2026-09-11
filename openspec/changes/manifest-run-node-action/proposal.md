# Proposal: manifest-run-node-action

## Summary

Add a manifest action type that invokes a single OpenRegister flow node
against the page's object, collecting the node's own declared config through
a generic dialog — not a new `@pick:` sentinel token. This is the
nextcloud-vue half of dossiq `documents-on-the-case` task 3.3, which needs a
manifest action shaped like `type: run-action, node: DossiqMergeTemplateNode,
subject: @objectId, config.templateSlug: @pick:template`.

## Why

`documents-on-the-case` 3.3 measured, against this repo's `development` on
2026-09-11, that the literal action as specced cannot be built as written, for
two independent reasons — both re-verified while writing this proposal
(commit `101243b`):

1. **The name collides.** `run-action` is already a `enum` member of
   `$defs` step `type` for **setup-wizard steps**
   (`src/schemas/app-manifest-v2.schema.json:76`), a different concept
   ("call an endpoint" during setup). A header/row action of the same name
   with flow-node semantics needs a different name — this proposal uses
   `run-node`.
2. **`@pick:` cannot exist as a sentinel token.** `src/utils/sentinelTokens.js`
   is a CLOSED, byte-pinned vocabulary of tokens that ALL resolve
   synchronously, from ambient context (the clock, the signed-in user, route
   params, the page object, app config) — see the module's own docblock,
   `SENTINEL_TOKEN_PATTERNS`, and the one-to-one mirror into the JSON Schema
   `$defs` that a unit test enforces byte-for-byte. There is no context in
   which a token resolver can open UI and block on a person answering. Adding
   `@pick:` there would mean either (a) making token resolution itself async
   and UI-capable — a change to how every one of the ~15 existing tokens is
   resolved, for the sake of one new one — or (b) special-casing `@pick:` as
   the one token that is NOT resolved by the token machinery, which defeats
   the point of a closed, uniformly-resolved vocabulary.

(2) is where this proposal actually departs from the blocked design, rather
than just picking a new name. It does not touch the token vocabulary at all.

## What Changes

**No new sentinel token.** Instead, a new action `type: "run-node"` that
follows the EXISTING `open-form` / `export` precedent already in
`actionsDispatcher.js`: those two types don't do their work inline either —
`open-form` calls `context.openForm(action)` and returns immediately; the
actual field-collection-then-persist round trip happens entirely inside the
rendering surface (`CnActionButtons` mounting `CnAdvancedFormDialog`), driven
by the schema the create dialog already knows how to render. `run-node` does
the same shape, with the node's declared `configForm()` (OpenRegister's
existing `IFlowNodeConfigForm` interface — see `or-flow-run-node`'s design.md
RN-2) standing in for the object schema:

- `dispatchAction` gains `case 'run-node'`, requiring `context.openRunNode`
  (mirroring `context.openForm` / `context.openExport`) — a function the
  rendering surface provides. It resolves immediately once the dialog opens;
  it does not itself wait for the user.
- The rendering surface (`CnActionButtons`) fetches the node's config form via
  the new OpenRegister endpoint (`or-flow-run-node`'s
  `GET .../{flowId}/{nodeId}` describe call, or folded into the POST per that
  proposal's implementation), renders a generic field-per-declaration dialog
  (reusing the SAME field renderer `CnFlowSidebar` already has for
  `type/label/help/required/optionsFrom` — no new form-rendering code), and on
  submit POSTs `subject` + the collected `config` to
  `POST /api/flows/{flowId}/nodes/{nodeId}/run`.
- A node with an EMPTY `configForm()` (or none declared) skips the dialog
  entirely and runs immediately — the same "empty form is itself information"
  rule `flow-node-config-forms` already established for the editor.
- Manifest fields for the action: `type: "run-node"`, `flowId` (string,
  required — see note below), `nodeId` (string, required), `subject`
  (token-resolved, typically `@objectId`), `successMessage` / `errorMessage`
  / `refresh` (same contract as `api-call` / `agent`).

**`flowId` is required on the action, not inferred.** `DossiqMergeTemplateNode`
could in principle live in more than one flow; the manifest author names
which published flow's instance of the node to call, the same way `api-call`
names its own `url` rather than the dispatcher guessing an endpoint.

## Out of scope

- The `@pick:` token itself does not ship, anywhere, under any name. If a
  FUTURE action genuinely needs a synchronous, ambient-context pick (not
  "open a dialog and wait"), that is a separate proposal against
  `sentinelTokens.js`, argued on its own merits — nothing here should be read
  as having decided that question either way.
- OpenRegister's authorization design (`or-flow-run-node` RN-1) is not this
  repo's decision; this proposal's dispatcher code sends the request and
  surfaces whatever 403 comes back (same fail-closed handling `api-call` and
  `agent` already use for a rejected call).
