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

This change adds an app-level top bar to `CnAppRoot` that carries the brand
block, behind the board look. The navigation then stops drawing the block.

1. A new `CnBrandBar` component draws the 237px block, a 1px divider and a
   slot for the app's own bar content.
2. `CnAppRoot` mounts it above the navigation and content in the board look
   when a brand is declared (`nav.brand`, or the new `brand` prop).
3. `CnAppNav` skips its own brand block while the bar draws it.
4. `nav.brand.placement` (`"top-bar"` or `"nav"`) lets an app keep the block
   in the navigation under the board look.

## Reference screens

| Screen | Live board |
|---|---|
| `dossiq/DqKop` | https://identity.conduction.nl/screens/board?id=dossiq/DqKop |
| `werkplek/AppZijbalk` | https://identity.conduction.nl/screens/board?id=werkplek/AppZijbalk |

Values read from `DqKop`: bar min-height 68px, padding 0 20px 0 14px, white
surface, 1px bottom line; brand link 237px wide, min-height 48px, padding 0
6px, radius 8px, gap 10px; emblem 34px high; organisation 13px muted;
app name 18px weight 700; divider 1px by 28px, gap 12px around it.

## Out of scope

- Nextcloud's own top bar (`#header`). See design.md for why the bar is the
  app's, not injected into it.
- The search field, notification bell and user menu of `DqKop`. The bar has a
  slot for them; the library does not invent their content.
- The apps menu button after the divider (Nextcloud owns the app switcher).

## Impact

Additive. One optional manifest key (`nav.brand.placement`), one new
component, one new prop on `CnAppRoot`. Under the board look an app that
declares `nav.brand` sees the block move from the navigation to the bar; set
`placement: "nav"` to keep it. Without the board look nothing changes.
Manifest schema minor bump.
