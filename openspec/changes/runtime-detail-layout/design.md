# Design: runtime-detail-layout

## D1. One prop, one read

`layoutLeaf: { type: String, default: '' }`. Empty means today's behaviour,
with no request. When set, the read runs after the object loads (the leaf
reads the object's type value server side) and again when the object id
changes. The read goes through the same `apiBase` as `CnIntegrationCard`, so a
consuming app that already sets `apiBase` changes nothing else.

## D2. Merge by part, the layout wins whole per part

A type layout that names three header fields means three, not three plus the
manifest's: buildiq's own rule is that a part replaces whole (its
`PageLayoutLeafProvider` header note). So per part present in the answer:

| answer part | replaces | kept when absent |
|---|---|---|
| `header.fields` | `headerFields` | yes |
| `tabs[]` (`id`, `label`) | order and labels of `sidebarTabs` with those ids; tabs not named are dropped | yes |
| `widgets[]` | `widgets` (and the derived grid layout) | yes |

A tab id the manifest does not declare is ignored with a console warning: the
page cannot render a tab it has no component for.

## D3. Parts the page does not draw

`taskList` (`panel.placement`, `panel.tabs`, `panel.collapsed`) and
`uploadFields` belong to the host's task list and upload dialog. The page
emits `layout-resolved` with the whole answer and exposes it on the injected
`objectSidebarState` as `layout`, so those components read it without a
second request.

## D4. Failure is silence

A 404 (leaf not registered, buildiq absent), an error or `items: []` renders
the manifest config. No toast, no empty state: an instance without buildiq
must look exactly as it does today.
