# Proposal: admin-shell-remembers-tab

## Why

launchpad's admin page draws its own tab strip (BeheerTabs) that opens on the tab the administrator used last, from
browser storage. Moving it onto CnAdminSettingsShell's `tabs` (with the underline strip, #1666) would lose that: the
shell keeps the open tab in the address only.

## What changes

`tabStorageKey` on CnAdminSettingsShell: with a key, the shell stores each tab the reader opens and opens on the stored
one when the address names no tab. The address still wins. Empty (the default) remembers nothing, so no app changes.

A shell that opens on a tab other than the first (named in the address, or remembered) emits `tab-change` once on mount,
so an app whose breadcrumb or title follows the tab is right from the first paint.
