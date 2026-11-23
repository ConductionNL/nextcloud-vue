---
kind: code
depends_on: [screens-chrome-parity]
---

# Proposal: screens-brand-block-top-bar

## Summary

On the screens (`zuiddrecht/DqKop`, `werkplek/AppZijbalk`) the first thing in
the top bar is a 237px brand block: the emblem, the organisation name and the
app name. The library draws the same block, but at the top of the app
navigation (`CnAppNav`, `nav.brand`). Two consequences: the block sits in the
wrong place, and an app that has no `CnAppNav` (portaliq) has no block at all.

This change draws the block at the start of Nextcloud's own header, behind the
board look (Ruben's decision, 9 Oct: inside the Nextcloud header, not an app
bar of its own). The navigation then stops drawing it.

1. A `CnBrandBar` component draws the 237px block (emblem, organisation, app
   name, 1px divider at its end) and teleports it into `#header`, before the
   app menu.
2. `CnAppRoot` mounts it under the board look when a brand is declared
   (`nav.brand`, or the new `brand` prop) and `#header` exists.
3. `CnAppNav` skips its own brand block while the header draws it, and draws
   it when `#header` is absent.
4. `nav.brand.placement` (`"header"` or `"nav"`) lets an app keep the block in
   the navigation under the board look.

## Reference screens

| Screen | Live board |
|---|---|
| `dossiq/DqKop` | https://identity.conduction.nl/screens/board?id=dossiq/DqKop |
| `werkplek/AppZijbalk` | https://identity.conduction.nl/screens/board?id=werkplek/AppZijbalk |

Values read from `DqKop`: brand link 237px wide, min-height 48px, padding 0
6px, radius 8px, gap 10px; emblem 34px high; organisation 13px; app name 18px
weight 700; divider 1px by 28px.

## Out of scope

- The rest of `DqKop` (search, notification bell, user menu): Nextcloud's
  header owns them.
- A bar of the app's own (rejected, see design.md).

## Impact

Additive. One optional manifest key (`nav.brand.placement`), one new
component, one new prop on `CnAppRoot`. Under the board look an app that
declares `nav.brand` sees the block move from the navigation to the header; set
`placement: "nav"` to keep it. Without the board look nothing changes.
Manifest schema minor bump.
