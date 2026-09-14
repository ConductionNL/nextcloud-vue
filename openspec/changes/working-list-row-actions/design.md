# Design: the working list and what you can do from a row

## Component and surface

`CnIndexPage`, `CnDataTable`, `CnActionsBar`, `useListView`, the
navigation builder and the command palette, plus two new components,
`CnRowActionMenu` and `CnQuickEditDialog`.

Kind: code, plus manifest keys consumed as config by apps.

## D1. The row menu asks the server what it may offer

A row action menu built from a static list is a menu that offers actions
a user cannot run and hides ones they can. The host returns the actions
available on that record for that caller, with the reason each refused
one was refused, and the menu renders what came back. dossiq already
answers this shape: `CaseActionProvider.php:178` returns available
actions per calling user with the guards that refused each one.

The menu never adds an action. It intersects what the page declares with
what the server allows, the same rule as a view's declared actions in
`saved-view-tree-and-labels`.

## D2. Quick edit is the detail form, scoped to fields

The quick edit dialog renders the same form widgets the detail page
renders, over the fields the page names. One form implementation, one
validation path, one save. A field the user may not write is not
editable here either, because the same server answer decides.

The list keeps its place. A saved row is replaced in place, the same rule
as the split view in `case-page-and-list-as-a-place`.

## D3. Indicators are declared, and never colour alone

A page declares its indicators: a field, a condition, an icon and a text.
Dimpact's set is suspension, extension, hierarchy and decisions; ours is
whatever the page names. Each indicator renders as an icon with a text
alternative and a tooltip. Eight booleans on a row is how four hundred
cases get triaged, and a colour-only indicator excludes the people who
need triage help most (WCAG 2.2 AA, 1.4.1).

## D4. Priority is read, never computed

D14 puts impact and urgency on the record and derives the priority from
them, with a rule raising it as the term approaches. The list reads the
derived value, sorts on it and renders a chip. If the list computed it,
there would be two answers to "how urgent is this" and the one on screen
would be the one nobody audited.

A record with no priority sorts last under a descending priority sort and
is not hidden.

## D5. Tabs are lenses, and a lens is a view

All, mine and unassigned are three views of one list, so they are the
saved views this wave already gives a route, a tree and a label. The tab
strip renders the views the page declares as tabs instead of as a
dropdown. That is a presentation choice, not a second mechanism, and it
means a fourth tab costs a declaration.

"Narrowed to my teams and subjects" is one of those lenses, with its
criteria reading the user's own claimed teams. The claim itself is a
preference, stored where the other preferences live.

## D6. A count on a navigation entry is a promise

A live count beside a navigation entry is read as truth and is expensive
to keep true. The count is fetched with the list's own count query, is
refreshed when the list is, and is absent rather than stale when the page
cannot confirm it. A per-record-type entry is declared by the host; the
library renders entries and counts them against the ADR-097 budget.

## D7. Shortcuts are discoverable or they do not exist

OpenProject serves its shortcut list at `get :keyboard_shortcuts` for a
reason. An undiscoverable shortcut is not operable, so every shortcut is
listed in the command palette, shown on a help key from the list, and
written into the component reference. The set covers the actions a
handler repeats: move through rows, open, run the primary action, quick
edit, select, and run a bulk action.

## Risks

- **A menu that waits.** Asking the server per row on render is a request
  per row. The actions come back with the list rows in one call, and the
  menu re-asks only for the row it opens on, so a list of ninety is one
  request.
- **An indicator set nobody curates.** More than a handful of icons on a
  row is noise. The renderer caps what it draws and puts the rest behind
  the row menu, and the cap is declared, so an app sees it rather than
  discovering it.
- **A quick edit that races.** Two handlers editing one row from two
  lists is the ordinary case. The save carries the row's version and a
  conflict is shown with both values, never silently overwritten.
- **Tabs and a tree.** The tab strip and the view tree render the same
  views. The page declares which views are tabs; everything else lives in
  the control, and a view is never in both places at once.
