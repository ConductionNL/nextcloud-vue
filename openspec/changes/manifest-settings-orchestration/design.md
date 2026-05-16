# Design: manifest-settings-orchestration

## Decision summary

| Question                                      | Decision                                                   |
|-----------------------------------------------|------------------------------------------------------------|
| `tabs[]` location in the manifest             | Top-level inside `pages[].config` (sibling of `sections[]`) |
| Relationship between `sections` and `tabs`    | XOR — exactly one MUST be set, never both at the same level |
| Sub-tabs (`tabs[].tabs[]`)                    | Out of scope (YAGNI)                                       |
| Tab identifier                                | Required `id: string` per tab; uniqueness validator-warned |
| Default active tab                            | First tab; overridable via `initialTab: <id>` prop         |
| Tab switching behavior                        | In-page state only (no URL hash) for v1; consumer router owns the page route |
| `component` widget body kind                  | New built-in `widget.type === "component"` with `componentName` |
| Legacy `customComponents` fallback for widgets | Kept (back-compat) but now JSDoc-deprecated                |
| Schema version bump                           | None — schema stays at `1.2.0` (additive change)           |

## Why a top-level `tabs[]` instead of "first section is the tab strip"

Three rejected alternatives:

1. **Sections that group themselves**: every section gets a `tabId`
   field; the renderer groups by `tabId`. Rejected — splits the
   tab metadata (label, order) across N sections; manifest
   authors have to keep them in sync.
2. **One tab per section**: implicit "every section is its own tab."
   Rejected — most real apps want >1 section per tab (a tab is
   usually a logical group of 2–5 sections, like
   "General → app + ui + locale" sections).
3. **`tabs[]` AND `sections[]` together**: tabs come first; flat
   sections render below. Rejected — confuses the page layout
   (where do the flat sections live? Above? Below? Inside the
   active tab?). The XOR rule keeps the page surface unambiguous.

The chosen `tabs: [{ id, label, sections }]` shape is the same shape
detail pages use for `sidebarTabs` (manifest-detail-sidebar-config),
so the patterns line up across the manifest surface.

## Why a `type: "component"` discriminator instead of relying on the existing fallback

The rich-sections change made `widgets[].type` resolution fall through
to `customComponents` on miss. That works, but:

- A reader can't tell at a glance whether `{ type: "WorkflowEditor" }`
  is a typo of `version-info` or an intentional consumer component.
- Future built-in widget names risk shadowing existing consumer
  registry names.
- The fallback path is undocumented in the schema description.

Adding a discriminator (`type: "component"`) makes the manifest
self-describing:

- `type: "version-info"` — built-in.
- `type: "register-mapping"` — built-in.
- `type: "component"` + `componentName: "X"` — custom, look up X.

The legacy fallback is kept so `manifest-settings-rich-sections` and
its consumers don't break. JSDoc documents the legacy path as
deprecated; a follow-up change can flip the warn to an error once
consumers have migrated.

## Why `initialTab` is a prop, not a manifest field

Two arguments:

- The active tab is per-user UI state (the user's last viewed tab),
  not part of the page contract. The consumer's router or
  preference store owns it.
- Embedding `initialTab` in the manifest would imply persistence
  across reloads. We don't want to teach the manifest about user
  state.

So: the manifest declares the SHAPE (which tabs exist + their
order). The runtime owner (the wrapping app or the consumer's
preference store) decides the active tab via the `initialTab` prop.

## CSS / theming

- Tab strip uses Nextcloud CSS variables ONLY: `--color-primary`,
  `--color-primary-element-text`, `--color-border`,
  `--color-background-hover`, `--color-text-maxcontrast`. No hex
  literals, no `rgba()` overrides.
- Tab buttons use `border-radius: var(--border-radius-large)` and a
  4px bottom-border in `--color-primary` for the active state
  (matches Nextcloud's `NcAppNavigationItem` active-tab pattern).
- The tab strip MUST collapse to a vertical stack on viewports
  narrower than 768px (mirrors `CnSettingsSection`'s actions
  collapse pattern).

## Backward compatibility audit

Three back-compat scenarios MUST keep passing:

1. **Pre-rich-sections, bare-fields settings**:
   `sections: [{ title, fields }]` — covered by REQ-MSO-7.
2. **Rich-sections settings**:
   `sections: [{ title, widgets: [{ type: "version-info" }] }]` —
   covered by REQ-MSO-7.
3. **Legacy `customComponents` fallback for unknown `widget.type`**:
   `widgets: [{ type: "WorkflowEditor" }]` resolved via
   `customComponents.WorkflowEditor` — covered by REQ-MSO-6.

No existing test in `CnSettingsPage.spec.js`,
`CnSettingsPageRichSections.spec.js`, or
`app-manifest.schema.spec.js` MUST be modified.
