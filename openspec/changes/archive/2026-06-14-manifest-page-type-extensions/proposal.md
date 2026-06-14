# Manifest page-type extensions

## Why

The OR-abstraction audit's Phase 3 adoption work (2026-05-03) surfaced
a sharp signal about the closed `pages[].type` enum in the existing
manifest schema. Today the enum is `index | detail | dashboard | custom`.

Phase 3 agent 2 mapped openregister's 30 routes against the enum and
found **17 of 30 require `type:"custom"`** (57%). The custom share
broke down as:

- 4 logs / activity-trail pages
- 5 settings / admin pages
- 3 chat / conversation pages
- 5 file-browser / document pages

These are recurring page shapes across the fleet — every app has a
"settings" page, most have a "logs" page, several have "files" and
"chat". Forcing them into `type:"custom"` defeats the manifest's
purpose of being declarative: a `type:"custom"` page just points at
a hand-written component, so it's no different from rolling your
own router.

If we don't extend the enum, the manifest convention will stall at
~50% expressive coverage on every consuming app. Worse, the
"escape hatch via custom" makes it hard to compare apps at a glance
or for the App Builder admin UI to know what a page does.

## What Changes

Extend the closed `pages[].type` enum from `index | detail | dashboard
| custom` to:

```
index | detail | dashboard | logs | settings | chat | files | custom
```

Four new built-in types:

- **`logs`** — read-only audit-trail / activity-log surface. Consumes
  `pages[].config.{register?, schema?, source?}` to identify the log
  source. Renders via a new `CnLogsPage` component that wraps
  `CnDataTable` with timestamp + actor + action columns + filtering.
- **`settings`** — admin / config surface. Consumes `pages[].config.{
  sections}` where each section declares its own field set. Renders
  via a new `CnSettingsPage` component that wraps `CnSettingsCard` +
  `CnSettingsSection` with form-binding to `IAppConfig` keys via the
  app's existing settings controller.
- **`chat`** — conversation / messaging surface. Consumes
  `pages[].config.{conversationSource, postUrl, schema?}`. Renders
  via a new `CnChatPage` component (initial implementation can wrap
  NC Talk's embeddable widget; future iterations can host the
  conversation thread directly).
- **`files`** — file-browser / document surface. Consumes
  `pages[].config.{folder, allowedTypes?}`. Renders via a new
  `CnFilesPage` component that wraps NC Files' file-picker /
  embedded view.

The companion components (`CnLogsPage`, `CnSettingsPage`,
`CnChatPage`, `CnFilesPage`) ship in this same change.

`CnPageRenderer`'s type dispatcher gets four new branches; the
`pageTypes` extension prop on `CnAppRoot` continues to allow apps to
register custom types beyond these eight (via `type:"custom"` +
`component` registry name).

## Problem

The closed enum is a deliberate design choice from
`add-json-manifest-renderer/spec.md` REQ-JMR-3 — it's there so the
schema validator can reason about every page type. But "custom" is
the get-out-of-jail-free card, and it dominates the per-app
manifests at adoption time. Without first-class types for logs /
settings / chat / files, every app's manifest is half-declarative
and half-pointer-to-bespoke-code.

## Proposed Solution

Extend the enum + ship four new page-type components in the same
change. Each new type is closed-shape: it consumes a specific
`pages[].config` field set, has a default component, and supports
the same `headerComponent` / `actionsComponent` / slot-override
escape hatches the existing types do.

The schema bumps from v1.0 to v1.1; the canonical schema URL is
unchanged (the schema is versioned via its `version` field, not its
URL). Apps using the existing four types continue working unchanged;
apps that want the new types declare `type:"logs"` etc. and remove
their custom-component pointers.

## Out of scope

- A `kanban` / `tree` / `map` page type (defer to a successor change
  if a third app needs them; today only pipelinq's pipeline editor
  needs `kanban`).
- A backend-side capability advert for "this app uses type:logs"
  (apps already declare what they use via `pages[].type` reading).
- Migrating decidesk's existing `type:"custom"` settings page to
  `type:"settings"` — that's the consumer-side
  `decidesk-manifest-v1` change (ConductionNL/decidesk#143) tracking
  per-page refactors.

## See also

- Phase 3 audit follow-up: openregister adoption found 17/30 routes
  needing `type:"custom"` — this change closes that gap.
- `nextcloud-vue/openspec/changes/add-json-manifest-renderer/specs/json-manifest-renderer/spec.md` — parent contract.
- Hydra ADR-024 (App manifest fleet-wide adoption) — fleet-wide
  convention this extension serves.
- Companion change: `manifest-resolve-sentinel` (ships alongside) —
  introduces `@resolve:{key}` for register/schema indirection in
  `config` blocks. The new page types consume `config.register` etc.,
  so the sentinel applies to them too.
