---
kind: code
---

# Proposal: working-list-row-actions

## Summary

The difference between processing forty cases a day and twelve is what a
handler can do without opening one. Give the row the case's full action
menu, a quick edit, state indicators a person reads at a glance, a
priority that orders and colours the list, and a keyboard path through
all of it.

Round 4 discovery cluster 15, "The working list and what you can do from
a row" (`procest/_round4/discovery/build-plan.md` in
ConductionNL/market-intelligence, 2026-09-14). Owner nextcloud-vue, size
M, decision D14, depends on cluster 58. The cluster's mechanism line:
extend nextcloud-vue list components and dossiq `task-search-fields`.

## Candidates

Eleven, all of them. Two are `must`.

| candidate | relevance | driven passers | dossiq |
|---|---|---|---|
| C-search-28 case action menu on the list row | must | xxllnc-zaken | no |
| C-search-31 state indicator icons in the case list | must | dimpact-zac | partial |
| C-search-6 priority that orders and colours the list | should | gitlab, kanboard, vikunja | partial |
| C-search-16 lists narrowed to the user's own teams and subjects | should | znuny | no |
| C-search-27 all, mine and unassigned as tabs on the case list | should | valtimo | partial |
| C-search-33 keyboard operation of the list and the reply box, documented | should | freescout, openproject | no |
| C-search-11 navigation entry and list page per case type, with a count | should | valtimo | partial |
| C-search-12 separate search page per entity type | should | opencase | partial |
| C-search-15 inline edit of a case from the list row | should | none, easy-redmine documented | no |
| C-search-18 stated response time requirement for the working screens | could | none, visma-circle documented | unread |
| C-access-and-privacy-24 record listed on the team's page | could | nextcloud-deck | no |

The cluster reads 13 passers, 11 driven and 2 documented, proving system
gitlab.

## The decisions it rests on

- **D14, the priority model.** Ruben's answer and the recommendation
  agree on option 2 with option 3 on top: store impact and urgency,
  derive the priority, and let a rule raise it as the term runs out. So
  the list sorts and colours on a derived value, and a human can still
  override it. The candidate note is blunt about the state today: "a
  value in a demo seed with nothing behind it"
  (`demo_caseload_seed_data.json`). The corpus has no row for priority at
  all, which D6 closes.
- **D6**, relevance-led promotion. Both `must` members enter, each on one
  driven passer.
- **D21**, documented-only candidates admitted and labelled. C-search-15
  and C-search-18 have no driven passer.
- **D17**, a broad market including MKB. C-search-18 is a performance
  claim rather than a capability, and it is recorded rather than dropped.

## The proving passers

- **xxllnc Zaken** is the action menu on the row, on the dashboard and on
  every case list (`dashboard-anatomy.md`, `search-anatomy.md`). This is
  the member with the sharpest municipal clause in the whole cluster.
- **Dimpact ZAC** is the indicator set: the case list carries icons for
  suspension, extension, hierarchy and decisions
  (`dashboard-worklists/spec.md`). dossiq shows overdue and nothing else.
- **GitLab, Kanboard and Vikunja** are the priority, three driven. GitLab
  sorts a queue by label priority, Kanboard scores it with a colour,
  Vikunja fields it.
- **Znuny** narrows every list to what a person claimed: `personal_queues`
  and `personal_services`, the My Queues and My Services settings. A
  caseworker in three teams sees one inbox today.
- **OpenProject** documents its keyboard shortcuts and serves them:
  `get :keyboard_shortcuts` on work packages. FreeScout is the second
  driven passer.
- **Valtimo** puts all, mine and unassigned as tabs on one list page
  (`CaseList.md`), and gives each dossier type its own navigation entry.

## What nextcloud-vue builds

- **The row action menu.** A row offers the actions the record offers,
  resolved per user and per record, run without opening it. The same
  intersection rule as a view's declared actions: a row never gains an
  action the user may not run.
- **Quick edit from the row.** A field is edited in a pop-up over the
  list, with the list keeping its place.
- **State indicators.** A page declares which flags it wants on a row.
  Each renders as an icon with a text alternative, never as colour alone.
- **Priority that sorts and colours.** The list reads the derived
  priority, sorts on it, and shows it as a chip. The value is computed by
  the owner, not by the list.
- **Mine, all and unassigned as tabs** on one page, and a list narrowed
  to the teams and subjects the user claimed.
- **A list page and a navigation entry per record type, with a live
  count.**
- **Documented keyboard operation.** Every repeated action has a shortcut,
  the shortcuts are discoverable from the list, and they are in the
  component reference.

## How dossiq consumes it

dossiq declares the action set, the indicator set and the tab set on
`#Cases`, `#Queue` and `#Tasks`, and points the priority chip at the
derived field. dossiq already has bulk transition and reassign (the
candidate note on C-search-28) so the row menu is the same actions at
single-row scale. dossiq's six named lenses on the case list and six on
tasks (`manifest.json#Cases quickFilters`) are one of the twenty
candidates the sweep overturned to `yes`, so the tabs requirement gives
those lenses a place rather than inventing them. `task-search-fields` in
dossiq carries the fields the task list searches.

The impact, urgency and derived priority properties are OpenRegister's
under D14, with the rule that raises priority as the term runs out in the
rules engine (cluster 19). nextcloud-vue reads the value and never
computes it.

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, `CnDataTable`, `CnActionsBar`,
  `useListView`, a new `CnRowActionMenu` and `CnQuickEditDialog`, the
  navigation builder, the command palette.
- Consumers: dossiq (Cases, Queue, Tasks), pipelinq, keepiq, humaniq,
  decidiq, opencatalogi.

## Backward compatibility

Every key is additive with a default. A page declaring no actions, no
indicators and no tabs renders the list it renders today.

## Theming

Nextcloud CSS variables only. A priority chip and an indicator take their
colour from the schema's own enum colour, the same source
`statusType.colour` already uses, so nldesign overrides them without the
component knowing.

## Existing specs it extends

`index-page` (the row, its columns and its actions), `data-display`
(`CnDataTable`), `multi-column-sort-ui` (sorting, which the priority sort
joins), `command-palette` (where the shortcuts are discovered) and
`wcag-a11y-anchor` (the keyboard path and the text alternatives).

## Size

M. One menu, one dialog, one chip and one tab strip over a list component
that already fetches, filters and sorts.

## Dependencies

`case-page-and-list-as-a-place`, the cluster the build plan names as this
one's dependency, because a quick edit and a row action only pay off on a
list that keeps its place. D14 must be answered before the priority chip
has a value to read, and it is.

## Out of scope, and why

- **C-access-and-privacy-24, a record listed on the team's page.** This
  is a Nextcloud platform integration, an `ITeamResourceProvider` in the
  consuming app's PHP, not a Vue component. Deck registers one at
  `lib/Teams/DeckTeamResourceProvider.php`. It belongs to the ten
  platform integration points decision D9 governs. Recorded here, built
  there.
- **C-search-18, a stated response time.** A performance claim about the
  product, not a capability of a component. Recorded, labelled
  documented, and the place for it is the fleet's own performance
  budget.
- Computing the priority. OpenRegister owns impact, urgency and the
  derivation under D14.
- Deciding which actions exist. The host declares them and the server
  authorises them.
