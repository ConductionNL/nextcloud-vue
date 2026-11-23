# Design: screens-brand-block-top-bar

## Decision (Ruben, 9 Oct): inside Nextcloud's header

Nextcloud draws `#header` itself: the app icons, the search, the user menu.
Three ways to get the brand block "at the start of the top bar" were weighed.

1. **A header slot.** Nextcloud exposes none for apps.
2. **Put the block into `#header`.** Not a supported extension point, but it
   is the only way to have the block IN the top bar the screens draw.
3. **A bar of the app's own** under Nextcloud's header (inside `NcContent`).
   Supported, but a second bar: the screens have one.

**Chosen: 2**, by Ruben's decision. Option 3 was built first and replaced.

### The risk, stated plainly

`#header` is Nextcloud's markup and Nextcloud may change it in any release.
Nothing guarantees the element exists, stays a flex row, or is not re-rendered.
This can break on a Nextcloud update. The fallback limits the damage: the
worst case is that the block is drawn in the navigation, as it was before this
change, never that it is lost or that Nextcloud's header is damaged.

### How it stays safe

- It mounts only when `#header` exists (`CnAppRoot` checks once, at creation,
  so the navigation never draws a block that then moves). With no `#header`
  the navigation draws the block.
- It adds exactly one node of its own, a host `div.cn-brand-bar-host`, as the
  first child of the header (so left, before the app menu), and teleports the
  block into it. It never moves, edits or removes a node Nextcloud drew.
- It re-checks after Nextcloud re-renders: a `MutationObserver` on the header
  and on its parent puts the SAME host back when it is dropped (never a second
  one), and hands the block back to the navigation (`unavailable`) when the
  header is gone for good.
- On unmount it removes only its own host.

## Layout

The block is 237px wide including the divider: the brand link flexes, the
divider (1px by 28px) ends the block. The header is 50px high; the block's
content (emblem 34px, two text lines of 13px and 18px at line-height 1.15) fits
inside it. Text colour is `--color-background-plain-text`, the colour Nextcloud
uses on the header, so the block reads on any header background.

## Where the brand comes from

`CnAppRoot`'s `brand` prop, else `manifest.nav.brand` (`logo`, `emblem`,
`name`, `caption`, `alt`). `name` is the app name (18px, bold); `caption` is
the organisation (13px), as the navigation block already reads them. The
resolving code is `src/utils/resolveBrand.js`, shared with `CnAppNav`.

## Default

Under the board look the default placement is `header`. `nav.brand.placement:
"nav"` keeps the old position. Without the board look the placement is ignored.

`CnAppRoot` provides `cnBrandInHeader` (a boolean). `CnAppNav` injects it
(default `false`) and skips its brand block when it is true, so the block is
never drawn twice and an app that wraps `CnAppNav` in its own `#menu` still
gets the right result.
