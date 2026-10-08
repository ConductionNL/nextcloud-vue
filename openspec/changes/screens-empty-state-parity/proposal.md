---
kind: code
---

# Proposal: screens-empty-state-parity

## Summary

The screens draw an empty state inside the card it belongs to: a 48px grey
circle with a 24px icon, one bold line of 16px, one grey sentence of 14px
(at most 480px wide, line height 1.45), and at most one button, 6px lower.
The block is centred with 28px 20px padding and an 8px gap. A dashed border
appears only on a drop zone, never on an empty list. The canon also says an
empty state is drawn, never described: a board that shows an empty list
shows this block.

The library has two empty states:

- `CnWidgetEmptyState`, used by five widgets, is close: a 48px circle, but
  a 14px/600 name, a 13px description capped at 32ch, 16px 12px padding and
  a 6px gap.
- `NcEmptyContent`, used directly by 45 components (CnIndexPage,
  CnCardGrid, CnDashboardPage, CnObjectKanban, CnDetailWidgetHost,
  CnRelatedObjectsWidget, CnTabsWidget, the pickers and more), draws a 64px
  icon at reduced opacity with a large heading and no circle, outside any
  card.

This change makes CnWidgetEmptyState the one empty state of the board look
and moves the library's own empty states onto it. A component that is
already in a card keeps it inside that card. Behind the board look
(`cnLook`, from `screens-dialog-parity`); the Nextcloud look keeps
`NcEmptyContent`.

1. The board values for CnWidgetEmptyState (`size: "card"`).
2. Every library empty state renders CnWidgetEmptyState in the board look,
   inside its card, with the component's existing `empty` slot still
   winning.
3. A drop zone is the only dashed empty block.

The switch is `look: "board"` from `screens-chrome-parity` (#1391); this
PR's `screens-dialog-parity` makes it readable in code as `cnLook`.

## Reference screens

- `learniq/LqRapportvergadering` (empty card with a primary action):
  https://identity.conduction.nl/screens/board?id=learniq/LqRapportvergadering
- `dossiq/DqZaakDocumenten` (drop zone, dashed):
  https://identity.conduction.nl/screens/board?id=dossiq/DqZaakDocumenten
- `learniq/LqItemanalyse` (empty state without an action):
  https://identity.conduction.nl/screens/board?id=learniq/LqItemanalyse
- `learniq/LqAanwezigheid` (empty state in a list card):
  https://identity.conduction.nl/screens/board?id=learniq/LqAanwezigheid

Only five boards draw an empty state today, all in learniq; the canon asks
for more. The citizen no-results page (`portaliq/ZoekenGeenTreffers`) is a
portaliq site widget and is out of scope here.

Canon: section 10 ("Empty state") and section 3 ("empty state drawn, never
described") of `UNIFORM-canon.md`.

## Builds on

- `screens-chrome-parity` (#1391): the `look: "board"` switch, the
  `cn-look-board` class and `src/css/look-board.css`.
- `openspec/specs/dashboard-page` ("empty state") and the widget empty
  state of `cn-dashboard-widget-refinements`.
- `form-file-and-camera-fields` and CnFileField for the drop zone.
- `screens-dialog-parity` (this PR) for `cnLook`.

## Affected consumers

Every app; most visibly on index pages with no rows, empty detail tabs and
empty dashboard widgets.

## Backward compatibility

Additive. `CnWidgetEmptyState` keeps its current size as the default
(`size: "widget"`); the `compact` prop stays. Every `empty` slot keeps
precedence over the built-in state.
