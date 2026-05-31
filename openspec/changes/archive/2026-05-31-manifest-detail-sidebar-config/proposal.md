# Manifest detail sidebar config

## Why

The audit reviewing the `@conduction/nextcloud-vue` manifest surface
flagged a prop-shape inconsistency between the two main page
components:

- `CnIndexPage.sidebar` is an **Object** of shape
  `{ enabled, columnGroups?, facets?, showMetadata?, search? }` — the
  recently-added manifest-driven sidebar config (REQ-MAS-1 of
  `manifest-abstract-sidebar`).
- `CnDetailPage.sidebar` is a **Boolean** that activates the external
  `CnObjectSidebar` plumbing through the `objectSidebarState` inject
  channel. Tabs and other sidebar options are split off into a
  separate `sidebarProps` object.

A manifest author writing two pages in the same `manifest.json` cannot
reuse the same mental model — index pages declare sidebar config
inline under `config.sidebar`, detail pages have to thread it through
the `sidebar` boolean PLUS a separate `sidebarProps` object. That
mismatch makes the manifest awkward to author and harder to validate
uniformly.

A second, related gap surfaced as adopting apps started building
`type:"custom"` pages purely to suppress the sidebar slot the host App
shell renders. There's no per-page declarative way to say "this index
/ detail / custom page intentionally has no sidebar"; the only escape
hatch is `type:"custom"` plus a hand-written wrapper that doesn't
mount `<CnIndexSidebar>` / `<CnObjectSidebar>` and that blanks the
host app's `#sidebar` slot via consumer-side ad-hoc state. That's the
exact opposite of the manifest-first promise.

This change closes both gaps:

1. Promote `CnDetailPage.sidebar` from a Boolean to an Object whose
   shape mirrors `CnIndexPage.sidebar` (and the existing detail-side
   `sidebarProps`).
2. Add a single `sidebar.show` boolean (default `true`) that gates
   sidebar rendering on **index**, **detail**, AND **custom** pages —
   declarable per page from `manifest.json` without forcing
   `type:"custom"`.

## What Changes

Two narrow, additive changes to existing components plus a schema
extension. No new components ship.

### `CnDetailPage.sidebar` Object shape (with Boolean back-compat)

`CnDetailPage.sidebar` accepts EITHER:

- The legacy Boolean form (`true` / `false`) — preserved unchanged
  for v1.x consumers, with a one-shot `console.warn` per component
  instance pointing at the new shape.
- A new Object form — same shape as `CnIndexPage.sidebar` plus the
  detail-specific fields that previously lived under `sidebarProps`:

  ```jsonc
  sidebar: {
    show: true,                       // default true; false hides the sidebar
    enabled: true,                    // alias of show; both supported
    register: 'leads',                // forwards to CnObjectSidebar
    schema: 'lead',
    hiddenTabs: ['notes'],
    title: 'Lead detail',
    subtitle: '...',
    tabs: [ /* manifest-abstract-sidebar tabs */ ],
  }
  ```

  The Object form is the recommended shape for new code. The existing
  `sidebarProps` prop continues to work for backwards compat — when
  both `sidebar` (Object) AND `sidebarProps` are set, the Object form
  wins for overlapping fields and a `console.warn` fires.

When `sidebar` resolves to `false` (Boolean) OR `{ show: false, ... }`
(Object), `CnDetailPage` MUST NOT activate the external
`objectSidebarState` channel — the host App's mounted
`<CnObjectSidebar>` stays inactive for that page.

### `sidebar.show` flag on `CnIndexPage`

`CnIndexPage.sidebar` gains a top-level `show` boolean (default
`true`). The semantics:

- `enabled` (existing) — **existence gate**: declares whether the
  page configures an embedded sidebar at all. When `false` or
  unset, the auto-mount path is bypassed entirely (no
  `<CnIndexSidebar>` element is rendered, the consumer's
  slot-based pattern remains active).
- `show` (new) — **visibility gate**: even when the sidebar is
  configured (`enabled: true`), `show: false` SUPPRESSES rendering
  for this page so manifest authors can hide the sidebar
  declaratively (e.g. on a print-style overview page) without
  removing the config.

`show` defaults to `true`. When `enabled === false`, `show` is
moot (no sidebar config to render). When BOTH are `true`, the
embedded `<CnIndexSidebar>` mounts as today.

This keeps `enabled` and `show` distinct rather than collapsing them:
the use case for retaining the config but hiding it (e.g. behind a
feature flag, conditional layout) is real, and consumers shouldn't
have to delete config to hide a rendered surface.

### `sidebar.show` for custom pages

Custom pages (`type: "custom"`) have no per-type config schema — the
config block is opaque. To let manifest authors hide the host App's
sidebar slot for a custom page **without** wrapping the page in a
custom shell, this change adds a top-level `sidebar` field to
`pages[].page` (sibling of `config`):

```jsonc
{
  "id": "wide-canvas",
  "type": "custom",
  "component": "WideCanvasPage",
  "sidebar": { "show": false }
}
```

`CnPageRenderer` reads the page entry's top-level `sidebar.show` and:

1. Sets a CSS class `cn-page-renderer--no-sidebar` on the renderer
   wrapper so consumer apps with style-driven layouts can hide a
   sibling sidebar.
2. Provides a reactive `cnPageSidebarVisible` value (via
   `provide`) consumed by `CnAppRoot` to conditionally render its
   `#sidebar` slot — that's the programmatic counterpart for apps
   that rely on `<slot name="sidebar">` rather than CSS layout.

The same top-level `sidebar` field is also accepted on `index` and
`detail` pages — when set, it acts as the canonical override
(taking precedence over `config.sidebar.show`). This gives manifest
authors one consistent place to suppress the sidebar on ANY page
type (`index | detail | custom | dashboard | …`).

### Schema additions

`src/schemas/app-manifest.schema.json`:

- Add a top-level `sidebar` property to `$defs.page.properties`
  (sibling of `config`), shape `{ show: boolean }`. Documented as the
  cross-page-type sidebar visibility gate.
- Update the `pages[].config` description to mention that detail
  pages MAY now use `config.sidebar` as an Object (mirroring the
  index shape) AND that `config.sidebar.show: false` on either page
  type suppresses the embedded sidebar.
- The schema's top-level `version` field is NOT bumped — these
  additions are non-breaking under the Boolean back-compat strategy.

### Validator additions

`src/utils/validateManifest.js`:

- Accept a top-level `pages[].sidebar` field (any page type). When
  set, MUST be a plain object; `sidebar.show` MUST be boolean when
  present; unknown keys tolerated for forward-compat.
- Extend `validateSidebarConfig` to accept and validate
  `config.sidebar.show` on index pages (boolean when set).
- Extend `validateSidebarConfig` to validate
  `config.sidebar` on detail pages (when set, MUST be either a
  Boolean for back-compat OR a plain object; when an object,
  `show` MUST be boolean if set, `tabs` rules from
  `manifest-abstract-sidebar` apply when `tabs` lives there).

## Problem

Without this change:

- A detail page's manifest config splits sidebar fields across
  `config.sidebar` (boolean) and `config.sidebarProps` (object). An
  index page does it in one block. Authors keep tripping over which
  half goes where.
- There's no manifest-declarable way to hide the sidebar for a
  specific page. Consumers either (a) bail to `type:"custom"` and
  re-implement the shell, or (b) blank the host App's sidebar slot
  with bespoke per-route logic that lives outside the manifest. Both
  defeat the manifest-first promise.

## Proposed Solution

Two surgical, additive changes to existing components plus a
schema extension. The Boolean back-compat shim keeps every v1.x
manifest working unchanged.

### Detail-page Object form (Strategy A — additive deprecation)

`CnDetailPage.sidebar` accepts both shapes. A `console.warn`
fires once per component instance when the Boolean form is used,
telling consumers to switch. The library never breaks the Boolean
form — it's deprecated for a release cycle, then we revisit.

### `sidebar.show` everywhere

The `show` flag lives in three places:

1. **Per-config**: `pages[].config.sidebar.show` for index pages
   and (post-this-change) detail pages.
2. **Per-page (canonical override)**: `pages[].sidebar.show` —
   sibling of `config`. Works on every page type, including
   `type:"custom"` where `config` is opaque.
3. **Component-level**: `CnIndexPage.sidebar.show` /
   `CnDetailPage.sidebar.show` for direct component use without
   the manifest renderer.

`CnPageRenderer` reads the page-level `sidebar.show` and:

- Adds a CSS class `cn-page-renderer--no-sidebar` on the
  rendered wrapper element.
- Provides a reactive `cnPageSidebarVisible` value consumed by
  `CnAppRoot` to conditionally render its `#sidebar` slot.

When the per-page `pages[].sidebar.show` and per-config
`config.sidebar.show` disagree, the per-page value wins — it
applies to ALL page types and reads as the more specific override
("for this entry in pages[], hide the sidebar"). A `console.warn`
fires at validation/render time.

## Out of scope

- A `sidebar.position` / `sidebar.width` / sidebar visual config —
  rendering remains the host App's responsibility through its
  `#sidebar` slot. This change only gates visibility.
- Animating sidebar enter/leave when `show` toggles. Consumers can
  layer transitions on the slot or the `cn-page-renderer--no-sidebar`
  class as they wish.
- Removing `CnDetailPage.sidebarProps`. It stays for back-compat;
  apps may migrate to the new Object form at their own pace.
- Promoting the `sidebar` config block to a formal `$def` in the
  schema. Defer to a future `manifest-config-defs` follow-up to
  keep this change surgical and conflict-free with the in-flight
  `manifest-settings-rich-sections` change touching the same
  schema file.

## See also

- `nextcloud-vue/openspec/changes/manifest-abstract-sidebar/` —
  parent change introducing the manifest-driven sidebar surface
  on index and detail pages. This change builds directly on its
  prop-shape conventions.
- `nextcloud-vue/openspec/changes/add-json-manifest-renderer/specs/json-manifest-renderer/spec.md` —
  parent contract; `pages[].config` is type-specific. This change
  introduces `pages[].sidebar` as the first non-config sibling
  field on a page entry.
- Hydra ADR-024 (App manifest fleet-wide adoption) — the
  convention this change serves.
- `CnDetailPage.vue` — current Boolean `sidebar` prop being
  promoted to Object.
- `CnPageRenderer.vue` — dispatch site that reads
  `pages[].sidebar.show` and emits the visibility signal.
- `CnAppRoot.vue` — host shell; consumes `cnPageSidebarVisible`
  inject to gate its `#sidebar` slot.
