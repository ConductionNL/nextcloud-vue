---
kind: code
depends_on: [screens-chrome-parity]
---

# Proposal: screens-detail-page-parity

## Summary

The screens draw every detail page the same way (canon sections 2 and 4): a
two-row header on the grey ground, folder tabs with grey count badges and
History as the last tab, a "What now?" card, body cards, and a 300px side
column of small cards. `CnDetailPage` already has most of the parts, from the
earlier rounds and `detail-action-model-and-case-surfaces`, but in a
different shape: the breadcrumb sits above the title, the pills above it
too, the title is a 22px h2 behind a 56px inset, the active tab has a
primary top edge and white count badges, and the activity is wherever the
manifest puts it.

Under `look: "board"` the detail page takes the screens' shape. Without it
nothing changes.

1. The header block: h1 on row 1 with the buttons; pills, breadcrumb, a
   middle dot and the meta line on row 2.
2. The header button order: quick actions, Edit, buildiq square, More.
3. Folder tabs: no primary edge, grey count badges, no icons, an Actions
   button at the end of the strip, the first panel joined to the strip.
4. The tab strip stays in the body column and the side column starts level
   with it, also when the strip is the first cell of the body grid. Not
   measured on a live page yet; the e2e decides whether code has to move.
5. History is the last tab, with the board timeline.
6. The "What now?" card takes the board kicker, markers and button.
7. Body cards and side cards take the board anatomy; the History side card
   ends with the identifier line.

## Reference screens

| Screen | Live board |
|---|---|
| `dossiq/DqZaak` (the canon case) | https://identity.conduction.nl/screens/board?id=dossiq/DqZaak |
| `dossiq/DqZaakHistorie` (History tab) | https://identity.conduction.nl/screens/board?id=dossiq/DqZaakHistorie |
| `pipelinq/PqTicket` | https://identity.conduction.nl/screens/board?id=pipelinq/PqTicket |
| `decidiq/DcBesluit` | https://identity.conduction.nl/screens/board?id=decidiq/DcBesluit |
| `werkplek/Tabs` (the tab strip as a part) | https://identity.conduction.nl/screens/board?id=werkplek/Tabs |

## Builds on

- `screens-chrome-parity`: the `look` switch, the page frame, the header
  button and the buildiq square.
- `detail-action-model-and-case-surfaces`: quick actions, grouped menu,
  `nextStep` and `CnNextStepCard`, header pills, `sideColumn`, tab counts.
  This change gives them the board shape.
- `zuiddrecht-pixel-gaps` and `-3`: the dropped type eyebrow, the breadcrumb
  line, `breadcrumb.currentField` and `breadcrumb.separator`,
  `showWidgetActions`. Under the board look these become the defaults.
- `detail-header-field-chips`: header fields as chips. Under the board look
  they render on row 2, after the breadcrumb, as the meta line.
- `the-activity-tab-reads-the-merged-feed` and `timeline-visibility-controls`:
  what the History tab shows and filters. This change is its look and its
  place in the strip.
- `case-page-and-list-as-a-place`: the tab in the address; unchanged.

## Consumers

Every app with a manifest detail page. The look changes only where
`look: "board"` is set (dossiq, pipelinq and decidiq first).

## Out of scope

- The stages bar under the header: `CnStagesWidget` bars variant, matched in
  the three Zuiddrecht rounds.
- The presence line ("Anouk Bakker is also looking at this case"):
  `CnPresenceAvatars`, unchanged here.
- Dialogs opened from the header (second screen-parity pull request).
## Decided by the design owner (8 Oct)

- The last breadcrumb is the object's kenmerk (case number, ticket number)
  where the object has one, read from `breadcrumb.currentField`; otherwise it
  is the title. The h1 always carries the title. Canon 4 is read this way.

## Impact

Additive and scoped under `.cn-look-board`. Two new optional keys
(`config.headerMeta`, `config.tabsLabel`). Minor version.
