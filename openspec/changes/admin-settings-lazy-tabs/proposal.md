# Proposal: admin-settings-lazy-tabs

## Why

CnAdminSettingsShell keeps every tab panel mounted and shows only the open one. A panel that fetches on `mounted()`
therefore fetches on page load, for every tab. launchpad's admin page wraps each `tab-<id>` slot in
`v-if="activeTab === id"` to mount a tab only while it is open, and tracks the open tab itself through `tab-change`
to do so. Every app with expensive tabs would have to repeat that.

CnTab's own `lazy` does not cover it: it delays only the first mount and then keeps the panel mounted, so a revisited
tab does not fetch afresh.

## What changes

- CnAdminSettingsShell takes `lazyTabs` (Boolean, default `false`). With it, a tab's `tab-<id>` slot is mounted only
  while that tab is open and unmounted when another tab opens.
- Without it nothing changes: every panel stays mounted.
- The panel element, the strip and the open tab in the address behave the same either way.
