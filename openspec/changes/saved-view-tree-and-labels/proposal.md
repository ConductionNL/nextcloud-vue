---
kind: code
depends_on: [saved-view-as-a-place]
---

# Proposal: saved-view-tree-and-labels

## Summary

Two hundred saved views are unusable as a flat personal list. Give them a
parent, a label and a name the rest of the product can call them by. A
child view inherits its parent's criteria, columns and sorting unless it
overrides them. A label filters the list of views. An administrator sets
which view a role opens on.

Round 4 discovery cluster 3, "Saved views, their tree and their labels"
(`procest/_round4/discovery/build-plan.md` in
ConductionNL/market-intelligence, 2026-09-14). Owner nextcloud-vue, size
M, decision D5, depends on cluster 58 "The case page and the list as a
place". The cluster's mechanism line: extend nextcloud-vue
`saved-view-as-a-place` and `view-group-share`.

## Candidates

Eleven of the cluster's sixteen. The other five are the board and the
date axis, split into `status-board-and-date-axis` in the same wave so
that every candidate sits in exactly one change.

| candidate | relevance | driven passers | dossiq |
|---|---|---|---|
| C-search-22 tree of saved lists with inherited criteria and columns | must | osticket | partial |
| C-search-23 labels over saved searches | could | xxllnc-zaken | no |
| C-search-3 named query reusable from dashboards, exports and the API | should | itop | no |
| C-search-5 saved search templates presetting columns and export | could | xxllnc-zaken | no |
| C-search-8 administered default list and default filter | should | glpi, redmine | no |
| C-search-29 default columns set per role | should | glpi | partial |
| C-search-32 filtered list shareable as a link | should | request-tracker, valtimo | no |
| C-search-35 ready-made saved lists shipped with the product | should | kanboard, opencase, xxllnc-zaken | yes |
| C-search-41 group the list by a field, with counts | should | frappe-helpdesk | no |
| C-search-43 permitted actions on a result set | could | none, atabix documented | no |
| C-search-42 two filter systems, chosen per list | could | none, easy-redmine documented | no |

The cluster reads 21 passers, 18 driven and 3 documented, proving system
gitlab. dossiq fails eleven of the sixteen members.

## The decisions it rests on

- **D5**, the cluster's own decision. Ruben revived all five parked
  candidates. The two that land in this change are the label and the
  shipped view set; the board and the date axis are in the sibling change.
- **D6**, relevance-led promotion. Every `must` candidate enters, so
  C-search-22 enters on one driven passer.
- **D21**, documented-only candidates are admitted and labelled.
  C-search-43 and C-search-42 have no driven passer. Both are marked
  documented wherever they appear and are never counted in a driven tally.
- **D17**, the product serves a broad market including MKB, so a `not`
  rating does not disqualify a candidate. Nothing in this change is rated
  `not`.

## The proving passers

- **osTicket** is the tree, measured:
  `include/class.queue.php:59-69` carries `FLAG_INHERIT_CRITERIA`,
  `_COLUMNS`, `_SORTING`, `_DEF_SORT`, `_EXPORT`, `FLAG_PUBLIC` and
  `FLAG_QUEUE`, with the agent queue tree at `scp/queues.php`. A child
  queue inherits each of those five things separately, which is the whole
  design.
- **GLPI** is the administered default, twice: `src/DefaultFilter.php`
  with the `DefaultFilter` dropdown per type, and display preferences at
  `src/DisplayPreference.php`, which is where per-role columns live.
- **iTop** publishes a named query once, in the query phrasebook under
  Administration, and calls it from anywhere.
- **Request Tracker** hands a list over as a link:
  `share/html/Admin/Tools/Shortener.html`, reaped by
  `sbin/rt-clean-shorteners.in`.
- **Frappe Helpdesk** groups the ticket list by a field, with counts.
- **xxllnc Zaken** carries the labels and the view templates in Uitgebreid
  zoeken V2 (`search-anatomy.md`).

## What nextcloud-vue builds

- **A parent on a view, and five inheritance flags.** A child view
  declares which of criteria, columns, sorting, default sort and export
  field set it takes from its parent and which it overrides. The control
  renders the views as a tree instead of a flat list.
- **Labels on a view, and a label filter over the view list.** A label is
  a string on the view entity; the control filters on it.
- **A named view callable by name.** The view gets a stable slug. A
  dashboard widget, an export action and an API caller name the slug
  rather than restating the query.
- **A view template.** A new view starts from a template that presets its
  columns, its sort and its export field set.
- **An administered landing view and administered columns per role.** The
  host declares which view a role opens on and which columns that role
  sees. A personal choice still wins over the administered one, and the
  user can return to it.
- **A view as a link.** Copy link on a view yields a URL that reopens the
  same list for anybody allowed to read it, over the route
  `saved-view-as-a-place` introduces.
- **Seeded views.** The host declares views that ship with the app. They
  render as a group, and a user may copy one but not delete it.
- **Group by a field, with counts.** The list groups on one field and
  shows a count per group.
- **Actions declared per view.** A view declares which row actions and
  bulk actions it offers, so a triage view offers three actions and not
  thirty.

## How dossiq consumes it

dossiq declares the tree, the labels and the seeded set on `#Cases`,
`#Queue` and `#Tasks` in `src/manifest.json`, the same three pages
`saved-view-as-a-place` names. dossiq already ships a default view in the
manifest rather than an administered one (the candidate note on
C-search-8), so the administered landing view replaces a hardcoded key
with a declared one. The view entity, its parent, its labels and its slug
are OpenRegister's, in `saved-search-views` and `view-group-share`.

## Affected projects

- `nextcloud-vue`: `CnSavedViewsControl`, `CnIndexPage`, `useListView`,
  the manifest schema and validator, the navigation builder.
- Consumers: dossiq (Cases, Queue, Tasks), pipelinq, humaniq, keepiq,
  opencatalogi, every app that sets `allowSavedViews`.

## Backward compatibility

Every key is additive and every prop keeps a default. A page that sets
`allowSavedViews: true` and declares nothing else renders the flat
dropdown it renders today, with no tree, no labels and no group headers.

## Theming

None. The tree, the labels and the group headers use Nextcloud CSS
variables through the existing list and navigation components.

## Existing specs it extends

`saved-views-ui` (the control, the dropdown and the route query),
`index-page` (the list and its columns) and `index-columns-per-scope`
(columns per scope, which the per-role columns requirement narrows rather
than replaces).

## Size

M. Nine requirements over components that exist, no new page kind and no
new store.

## Dependencies

`saved-view-as-a-place` (#1154) gives a view a route, which the link
requirement needs. OpenRegister's `saved-search-views` owns the view
entity that gains a parent, labels and a slug, and `view-group-share`
owns who may see a view.

## Out of scope

- **Two filter systems at once (C-search-42).** The candidate has no
  driven passer and its own note is the argument against it: two ways to
  save a list means two sets of saved lists, and one of them will be the
  stale one. Recorded here under D21 as documented, not built.
- Creating or storing the view entity. OpenRegister owns it.
- Who may see a shared view. `saved-views-shared-by-role` and
  `view-group-share` own that.
- The board, the second board axis and the date axis. Sibling change
  `status-board-and-date-axis`.
