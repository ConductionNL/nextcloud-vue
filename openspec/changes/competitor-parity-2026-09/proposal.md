---
kind: umbrella
depends_on: []
---

# Proposal: competitor-parity-2026-09

The nextcloud-vue half of the OpenSpec phase of the dossiq competitor
parity programme. Two sources of record, in order of writing: the gap
register at `procest/_gaps/` (2026-09-13) and the round 4 discovery sweep
at `procest/_round4/discovery/` (`build-plan.md`, `candidates.json`,
`decisions.md`, `found-and-lacking.md`, 2026-09-14), both in
ConductionNL/market-intelligence. The build plan moves 44 of the 631
candidates to nextcloud-vue.

Source of record for wave 1: the gap register at `procest/_gaps/`
in ConductionNL/market-intelligence (`README.md`, `gap-register.md`,
`gap-register.json`, `ownership-rules.md`, written 2026-09-13). Ruben's
rule, from the ownership rules: dossiq reaches 100% comparability with the
competition, and logic that belongs to another app is specified in that
app; dossiq consumes it. nextcloud-vue owns the shared component half, so
this umbrella indexes the components dossiq's parity changes wait on.

Nothing here is implemented. Each indexed change carries its own
`proposal.md`, `design.md`, `specs/` and `tasks.md`.

## Wave 1, from the gap register

Two changes on `development` were opened from the register. Size is the
one each proposal states: S is a placement, a declaration or one action,
M is a handful of tasks, L is a new mechanism.

| change | rows | size | dossiq consumer |
|---|---|---|---|
| `files-browser-columns` | 4.8 | S | `document-correspondents` (row 5.12), `scan-verdict-on-the-row` (row 4.19) |
| `saved-view-as-a-place` | Q9.16 | M | `cases-views-are-places` |

`files-browser-columns` lets `CnFilesBrowser` render columns the host
declares: a node attribute, a DAV property, or a value from an object the
host keeps per file. The two dossiq changes that wait on it both read
values that are not on the node. Sender and recipient come from dossiq's
document projection, the scan verdict from a `files_antivirus` DAV
property.

`saved-view-as-a-place` gives a saved view a route, a presentation of its
own and a line in the navigation. Today it is an item in a dropdown on one
page. dossiq sets a manifest key on `#Cases`, `#Queue` and `#Tasks` and
seeds nothing else.

## Three changes the register cites, opened from something else

The register names three more nextcloud-vue artefacts as covering rows:
`saved-views-shared-by-role` (row 9.4), `index-columns-per-scope` (row
11.9) and `dashboard-layout-per-user` (row 10.10). All three are on
`development` and all three cover their row. None was opened from the
register: each cites the round 2 competitor analysis
(`procest/_round2/compare/tier-b-and-sibling.md`) under decision D10 of
2026-09-08. They are listed here so a reader who arrives from a register
row finds them, not indexed above as parity changes. The openregister half
of row 9.4 is `view-group-share`, indexed in the openregister umbrella.


## Wave 2, from the discovery sweep

Six changes, opened together. Every candidate of clusters 3, 15 and 58
sits in exactly one of them.

| change | cluster or task | candidates | size | decisions | dossiq consumer |
|---|---|---|---|---|---|
| `case-page-and-list-as-a-place` | cluster 58 | 17 | M | D6, D21, D17 | split view on `#Cases` and `#Queue`, tab key on `#CaseDetail` |
| `saved-view-tree-and-labels` | cluster 3 | 11 | M | D5, D6, D21 | the tree, the labels and the seeded set on its three list pages |
| `status-board-and-date-axis` | cluster 3 | 5 | M | D5, D6 | `board` in `viewModes` on `#Cases`, replacing `WorkflowBoard.vue` |
| `working-list-row-actions` | cluster 15 | 11 | M | D14, D6, D21, D17 | the action set, the indicator set and the tab set on three pages |
| `timeline-visibility-controls` | openregister `timeline-entry-visibility` task 2.2 | ledger row 6.15 | S | D6 | passes `canSetVisibility` on the case page |
| `notification-preferences-ui` | cluster 10, the surface half | 4 | M | D6, D17 | declares its event catalogue, places the matrix |

Cluster 3 splits in two because decision D5 revived the board as its own
argument and the two halves have different dependencies: the tree waits
on cluster 58, the board waits on nothing but the schema's own status
field. The split is recorded in both proposals so no candidate is counted
twice.

Two clusters are openregister's and reach nextcloud-vue only as a render
half. `timeline-visibility-controls` is the chip, the toggle and the
filter chip openregister's own `tasks.md` leaves to us in task 2.2.
`notification-preferences-ui` is the screen over the per-user routing
ADR-031 gains; the routing, the transports and the templates stay with
openregister, integriq and dossiq.

## How the decisions were applied

- **D5**, all five revivals. The board and the date axis are the two that
  are ours. The calendar client, the satisfaction survey and the budget
  ceiling belong to other apps.
- **D6**, relevance-led promotion. Every `must` candidate enters whatever
  its passer count, which is what admits C-communication-29, a `must`
  with three driven passers and a marked matrix hole.
- **D14**, priority derived from impact and urgency with a rule on top.
  The list reads the derived value and never computes one.
- **D21**, documented-only candidates admitted and labelled. Six of the
  44 have no driven passer and each is marked documented in its proposal.
- **D17**, a broad market including MKB. Nothing is dropped for being
  small. Two members that are not component work at all say so in their
  proposal rather than being quietly omitted: a supplier's WCAG claim,
  and the team resource provider, which is PHP in the consuming app and
  belongs to the D9 platform programme.

## Build order

1. `files-browser-columns`. It waits on nothing. `CnCellRenderer` already
   renders the cells and the manifest v2 key is additive, so the change is
   a column contract over components that exist. Two dossiq changes name
   the slug, so it unblocks the most.
2. `saved-view-as-a-place`. The mechanism it consumes is specified:
   openregister's `saved-search-views` spec carries the view entity, the
   validated presentation config and the favourite flag. So this one can
   start too, and it is second because it is larger and nothing waits on
   it but one dossiq manifest key.

Neither change blocks the other. A lane with room can take both.

Wave 2 continues the same list.

3. `case-page-and-list-as-a-place`. The build plan names it as the
   dependency of both cluster 3 and cluster 15, so it goes before either.
   It waits on nothing itself.
4. `status-board-and-date-axis`. Independent of 3, and `WorkflowBoard.vue`
   in dossiq is the passer waiting for a shared component, so it can run
   in parallel.
5. `saved-view-tree-and-labels`. After 3, and it gives a view the slug
   that filinq's periodic document and every dashboard widget then name.
6. `working-list-row-actions`. After 3, because a quick edit and a row
   action only pay off on a list that keeps its place.
7. `timeline-visibility-controls`. S, and it should be built with
   openregister's `timeline-entry-visibility`, not before it: until the
   field, the default, the guard and the `visibility` parameter exist,
   the toggle has nothing to write.
8. `notification-preferences-ui`. After openregister's per-user routing
   under ADR-031, for the same reason.

## The halves the consuming apps carry

Wave 1's two changes end at the component. dossiq declares the columns on its
Files tab and the manifest key on its three list pages, and those halves
are specified in dossiq, not here. `scan-verdict-on-the-row` also reads a
Nextcloud platform property, which nextcloud-vue only has to render.

Wave 2 ends at the component too, and three of its six end earlier than
that. The view entity, its parent, its labels and its slug are
OpenRegister's in `saved-search-views` and `view-group-share`. The status
field, its lifecycle and the guards on a transition are OpenRegister's.
The derived priority is OpenRegister's under D14. The visibility flag,
its default, its guard and its audit are OpenRegister's. The notification
routing and the transports are OpenRegister's and integriq's. This
library renders all of it and decides none of it.
