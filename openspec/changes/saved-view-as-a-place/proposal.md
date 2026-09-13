---
kind: code
---

# Proposal: saved-view-as-a-place

## Summary

Let a saved view be a place rather than a setting. A pinned view gets a
route of its own, renders in any presentation OpenRegister's view config
declares (table, cards, board, calendar, timeline), and takes an entry in
the app's navigation under the page it came from. Today a saved view is an
item in a dropdown on one page, and it disappears the moment you navigate
away.

Opened from the dossiq competitor gap register, row Q9.16 "Does a saved
search behave as a place of its own, with its own views and a place in the
navigation" (`procest/_gaps/gap-register.md` in
ConductionNL/market-intelligence, 2026-09-13). Rated partial, owner
nextcloud-vue, slug `saved-view-as-a-place`, size M. Last sweep of the
OpenSpec phase.

## Motivation

`saved-views-ui` gives `CnIndexPage` an opt-in dropdown: list views, apply
one through a route query, save the current one, delete your own. That is
a filter you can name. It is not a place.

The best competitor, verbatim from the register's `best` column: "Vikunja
2.6.0: a saved filter is a project with a negative id
(saved_filters.go:74) carrying List, Gantt, Table and Kanban views, a
favourite flag and a place in the navigation, measured
(`_round4/compare/proposed-rows-batch7.md`)". The design decision in that
sentence is that a saved filter is the *same kind of thing* as the
collection it filters, so everything a project can do it can do.

The register's note: "rows 9.3 and 10.10 record `allowSavedViews` on the
Cases, Queue and Tasks pages (`src/manifest.json:1014,1115`), a personal
saved view inside a page; nothing makes it a page". Its `covered` column:
"none (saved-views-shared-by-role shares a view; index-columns-per-scope
styles one; neither makes it a place)". Both are correct: sharing changes
who sees a view, columns change how it looks, and neither gives it a URL,
a presentation of its own or a line in the navigation.

The register's `why`: "a saved view that opens as a board, a table and a
timeline and sits in the navigation is the list host's; the View entity
behind it is OpenRegister's". OpenRegister's `saved-search-views` already
carries the half this change consumes: REQ-VIEW-PRES-01 persists a
validated presentation config, REQ-VIEW-KANBAN-02 the board, REQ-VIEW-CAL-04
the calendar, and REQ-002 a favourite flag and a default view. Nothing in
nc-vue renders a view anywhere except inside the page it was saved on.

## Affected projects

- `nextcloud-vue`: `CnSavedViewsControl`, `CnIndexPage`, the router
  built from the manifest, the navigation builder, `useListView`.
- Consumers: dossiq (Cases, Queue, Tasks), pipelinq, humaniq, keepiq,
  opencatalogi, every app that sets `allowSavedViews`.

## What changes

- **A route per view.** `/<page>/views/:viewId` resolves to a page
  rendering that view: deep-linkable, bookmarkable, reloadable, and it
  survives navigating away and back.
- **Presentations belong to the view.** The view's own presentation config
  decides which of table, cards, board, calendar and timeline it offers,
  and which opens first. Switching presentation stays on the view's route.
- **A pinned view is in the navigation.** `pinned` (the existing favourite
  flag) puts the view under its page's navigation entry as a child. The
  app declares the group; nc-vue renders the entries. No new top-level
  entry, per ADR-097.
- **The host declares that a page offers places.** A manifest key on the
  page. Without it, today's dropdown, unchanged.

## Backward compatibility

A page with `allowSavedViews: true` and no new key behaves exactly as
today: the dropdown, the route query, save and delete. No view gains a
route, a presentation or a navigation entry until the host asks for it.
`CnSavedViewsControl`'s props and events are unchanged and gain defaults.

## Theming

None. The view page is `CnIndexPage` with a different data source; the
navigation entries are the existing navigation components.

## How dossiq consumes it

The register's `dossiq_half`: "declare the Cases views as saved-view
places once the host renders them". dossiq sets the manifest key on
`#Cases`, `#Queue` and `#Tasks` and seeds nothing else. Specified in
dossiq as `cases-views-are-places`.

## ADRs

- ADR-024: the page declares that it offers places; the renderer reads the
  manifest.
- ADR-097: a pinned view is a child of its page's entry, never a new
  top-level one, and the budget is counted with them.
- ADR-110: the navigation entries a view produces follow the app
  navigation contract.
- ADR-022: the view entity, its presentation config and its favourite flag
  are OpenRegister's and are consumed, not rebuilt.
- ADR-096: a view page is an index page, not a fourth page kind.

## Out of scope

- Creating the view entity. `saved-search-views` in OpenRegister owns it.
- Sharing a view. `saved-views-shared-by-role` owns who sees it, and a
  shared view becomes a place by the same rule as a personal one.
- Views across several schemas at once. A view is one query over one
  schema, as it is today.
