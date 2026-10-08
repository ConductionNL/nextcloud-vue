---
kind: code
depends_on: []
---

# Proposal: screens-chrome-parity

## Summary

The screens on identity.conduction.nl (the Zuiddrecht set, 8 Oct canon in
`UNIFORM-canon.md`, sections 1, 2 and 9) draw one chrome for every workplace
app: the content padding and width, the app navigation, the header buttons,
the buildiq square and the admin settings page. The library draws all of
these, and each one differs from the screens in size, spacing or order.

This change adds one switch, `look: "board"`, that the other three
screen-parity changes build on, and moves the chrome to the screens under
it. Nothing changes for an app that does not set the switch.

1. An app (or one page) can take the board look (`look: "board"`).
2. Page content takes the board padding and width.
3. The app navigation takes the board anatomy: width, entry height, section
   captions, attention counts, footer order.
4. Header buttons share one board button: 40px, radius 8, outlined or filled.
5. The buildiq square is the board square and sits in the same place on
   every page type.
6. The admin settings shell takes the board header and draws its sections as
   cards in a two-column grid.
7. A settings page declares where it saves: one save per section card, or one
   header save with a changes card. Never both.
8. The version card takes the board facts list and footer row.

## Reference screens

Every value in the spec deltas was read from these boards (flattened HTML in
`design-system/preview/screens/boards/`):

| Screen | Live board |
|---|---|
| `werkplek/AppZijbalk` (the app sidebar) | https://identity.conduction.nl/screens/board?id=werkplek/AppZijbalk |
| `dossiq/DqZijbalk` (dossiq sidebar) | https://identity.conduction.nl/screens/board?id=dossiq/DqZijbalk |
| `werkplek/Geavanceerd` (Advanced foldout) | https://identity.conduction.nl/screens/board?id=werkplek/Geavanceerd |
| `dossiq/DqZaken` (sidebar, header buttons) | https://identity.conduction.nl/screens/board?id=dossiq/DqZaken |
| `pipelinq/PqBeheer` (admin settings) | https://identity.conduction.nl/screens/board?id=pipelinq/PqBeheer |
| `decidiq/DcBeheer` (admin settings) | https://identity.conduction.nl/screens/board?id=decidiq/DcBeheer |
| `pipelinq/PqPersoonlijk` (personal settings) | https://identity.conduction.nl/screens/board?id=pipelinq/PqPersoonlijk |

## Builds on

- `zuiddrecht-pixel-gaps` (#1348 and before): the solid navigation primary
  action, the navigation card above the footer, the help entry, the emblem
  in the brand block. This change sizes them; it does not add them again.
- `zuiddrecht-pixel-gaps-2`: `nav.footer`. The footer order (Help, then
  Advanced) is a requirement here, the key is not new.
- `zuiddrecht-pixel-gaps-3`: `breadcrumb.separator` and the active-entry fix
  in `CnAppNav`.
- `cn-app-nav-shell-refactor`: section captions, counters and the primary
  action above the menu. This change gives them the board anatomy.
- `manifest-settings-orchestration`, `manifest-settings-rich-sections` and
  the `settings-components` spec: the sections and widgets a settings page
  renders. The save placement is new.

## Consumers

All five consumers render the chrome. Only an app that sets `look: "board"`
sees a difference: dossiq, pipelinq and decidiq are the first that will.

## Out of scope

- Nextcloud's own top bar. The screens draw a white header with the emblem
  and a search field; the programme rule is that Nextcloud's full-width top
  bar is the one allowed difference.
- `CnBrandStripe`. No workplace screen draws a stripe; the citizen and
  school stripes are `brand-motif-token`.
- Dialogs, wizards, dashboards, kanban, forms and empty states: the second
  screen-parity pull request.

## Impact

Additive. A new optional manifest key at the root and on a page, a new
stylesheet scoped under `.cn-look-board`, and new optional props whose
default is today's rendering. Minor version; manifest schema minor bump.
