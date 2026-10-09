# Design: screens-brand-block-top-bar

## What an app can legally put in the Nextcloud top bar

Nextcloud draws `#header` itself: the app icons, the search, the user menu.
Three ways to get the brand block "at the start of the top bar" were weighed.

1. **A header slot.** Nextcloud exposes none for apps. There is no supported
   extension point on `#header` for the app's own content.
2. **Teleport into `#header`.** `<Teleport to="#header">` works today, but the
   header is a Nextcloud-owned flex row with its own width rules, a fixed
   50px height and per-version markup (the app menu moved between 28 and 33).
   An app that puts nodes there depends on internals that change without
   notice, and the block would collide with Nextcloud's app icons rather than
   replace them. Not supported, so not chosen.
3. **A bar that belongs to the app.** `CnAppRoot` renders a bar at the top of
   the app's own region, inside `NcContent`, under Nextcloud's header. It is
   ours to size, so it can be the screens' 68px bar.

**Chosen: 3.** It uses nothing Nextcloud does not support, it works the same
on every Nextcloud version, and it exists without `CnAppNav`, which is what
portaliq needs. The cost is a visible Nextcloud header above the bar (the
programme rule already allows Nextcloud's full-width top bar as the one
difference from the screens).

## Layout

`NcContent` is a flex row (navigation, content). The bar cannot join that row
as a sibling without wrapping it. Instead the bar is `position: absolute`
across the top of the `NcContent` root, and the root takes
`padding-top: var(--cn-board-topbar-height)` (default 68px) with
`box-sizing: border-box`, so the navigation and the content start below it and
keep their own heights. Both the bar and the padding exist only while the
class `cn-app-root--brand-bar` is on the root, which requires the board look.

## Where the brand comes from

The same declaration as before: `CnAppRoot`'s new `brand` prop, else
`manifest.nav.brand` (`logo`, `emblem`, `name`, `caption`, `alt`). `name` is
the app name (18px, bold); `caption` is the organisation (13px, muted), as the
navigation block already reads them. The resolving code moves to
`src/utils/resolveBrand.js` so the bar and `CnAppNav` read one shape.

## Default

Under the board look the block belongs in the bar, because that is where the
screens draw it, so the default placement is `top-bar`. An app that wants the
old position sets `nav.brand.placement: "nav"`. Without the board look the
placement is ignored and the navigation draws the block as before.

`CnAppRoot` provides `cnBrandInTopBar` (a boolean). `CnAppNav` injects it
(default `false`) and skips its brand block when it is true, so the block is
never drawn twice and an app that wraps `CnAppNav` in its own `#menu` still
gets the right result.

## Risks

- A host that already positions something at the top of `NcContent` collides
  with the padding. The padding is one custom property, `--cn-board-topbar-height`,
  which a theme or app can set to 0.
- `z-index`: the bar is `1`, below Nextcloud's dialogs and the app sidebar's
  overlay.
