---
kind: code
---

# Proposal: status-board-and-date-axis

## Summary

`CnIndexPage` renders a table, cards and a map. It does not render a
board. Eight driven systems do, dossiq built its own, and the shared
component library has none, so every app that wants one writes it again.
Add a board view mode bound to the status field, a second axis so the
board groups by team or wijk as well as by stage, and a date axis view
where overlapping work is visible.

Round 4 discovery cluster 3, "Saved views, their tree and their labels"
(`procest/_round4/discovery/build-plan.md` in
ConductionNL/market-intelligence, 2026-09-14). Owner nextcloud-vue, size
M, decision D5. Five of the cluster's sixteen candidates land here; the
other eleven are in the sibling change `saved-view-tree-and-labels`, so
every candidate sits in exactly one change.

## Candidates

| candidate | relevance | driven passers | dossiq |
|---|---|---|---|
| C-tasks-and-phases-21 board of columns bound to the status field, with drag between them | should | forgejo, freescout, gitea, gitlab, glpi, huly, tuleap, vikunja | yes |
| C-search-37 several view types over the same work, each with its own filter | should | frappe-helpdesk, kanboard, vikunja | partial |
| C-search-26 second board axis, rows as well as columns | could | kanboard, taiga | no |
| C-search-44 date axis view showing overlap | could | vikunja | no |
| C-reporting-27 today's team board, one screen | could | huly | no |

C-tasks-and-phases-21 is the fourth strongest capability in the whole
sweep by driven passers, eight of them, and dossiq passes it
(`src/views/workflow-board/WorkflowBoard.vue`). That is the point: the
capability exists in one app and in no shared component.

## The decisions it rests on

- **D5**, which of the 41 revivals to re-argue. Ruben answered all five
  revivals, including the status board. The board was parked in round 3
  on one passer; it now has eight driven and dossiq ships one. The date
  axis was parked in batch 1 on OpenProject alone, with the argument that
  a Gantt reads four hundred parallel statutory terms badly; Vikunja is
  the second passer and the revival stands.
- **D6**, relevance-led promotion. Every `must` candidate enters. None of
  these five is a `must`, and all five enter on their driven passers.

## The proving passers

- **Vikunja 2.6.0** is both halves in one design. A saved filter is a
  project with a negative id (`saved_filters.go:74`) carrying List,
  Gantt, Table and Kanban views. So the board, the date axis and the
  saved view are the same object, which is the shape this change follows.
- **Kanboard** is the second axis: Project, Board with columns and
  swimlanes (`menu-tree.md`, `code-census.md`), and its filter dropdown
  ships eleven built-in queries.
- **GitLab** is the honest warning: issue boards list by label in CE, and
  assignee, milestone and iteration lists are Premium (journey 5). A
  second axis is where a board stops being free in the products that
  charge for it.
- **Frappe Helpdesk** puts list, report, kanban, calendar and dashboard
  over one table at `/app/hd-ticket`.
- **Huly** is the team board on one screen: left rail, Team,
  `plugins/team`.
- **dossiq** is the passer we already own: `WorkflowBoard.vue` drags
  between status columns today.

## What nextcloud-vue builds

- **`board` as a fourth view mode on `CnIndexPage`**, opt-in through
  `config.viewModes`, exactly as `cnindexpage-map-viewmode` added `map`.
  Columns come from the status field's own enum or lifecycle, in the
  order the schema declares, not from a list the page repeats.
- **Drag between columns writes a transition, not a field.** The
  component asks the host to run the transition and re-reads the row. A
  drag a guard refuses puts the card back where it came from and says
  why.
- **A second axis.** The board groups into rows by one more field, so a
  board splits by team or by wijk while the columns stay the stages.
- **A date axis view mode** where work with a start and an end renders on
  a time scale and overlaps are visible, opt-in per page and per view.
- **Each view mode keeps its own filter.** Switching from the board to
  the table keeps the view, not the filter you set on the board.

## How dossiq consumes it

dossiq adds `board` to `viewModes` on `#Cases` and points the board at
its status field. `WorkflowBoard.vue` then has a shared component behind
it instead of a private one, and the drag calls the same transition
endpoint it calls now. The candidate note reads `#Cases viewModes has
list, table and map, no board`, so this is a manifest key on a page that
already exists. The status field, its lifecycle and the guards on a
transition are OpenRegister's, in `saved-search-views`
(REQ-VIEW-KANBAN-02 carries the board presentation) and the lifecycle
specs.

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, `CnActionsBar`, `useListView`, a new
  `CnBoardView` and `CnDateAxisView` under `src/components/`.
- Consumers: dossiq (Cases), pipelinq, keepiq, decidiq, launchpad, every
  app holding a status field.

## Backward compatibility

`viewMode` gains two values and keeps its default of `table`. A page that
does not list `board` or `dateAxis` in `config.viewModes` is unchanged.
Every new prop has a default. No prop, event or slot is removed.

## Theming

Column headers, cards and the time scale use Nextcloud CSS variables
only. The status colour comes from the schema, which is where
`statusType.colour` already lives, so nldesign overrides it without the
component knowing.

## Existing specs it extends

`index-page` (the `viewMode` prop and the CnActionsBar toggle, modified
by `cnindexpage-map-viewmode` for the same reason), `saved-views-ui` and
`saved-view-as-a-place` (a view declares which presentations it offers).

## Size

M. Two view modes over the fetch path and the filters `CnIndexPage`
already owns, following a precedent set for the map.

## Dependencies

`saved-view-as-a-place` (#1154) for the presentation a view declares.
OpenRegister's `saved-search-views` owns the presentation config and the
board entry in it. The transition a drag runs is the host's.

## Out of scope

- Deciding what a status is. The schema's lifecycle owns that.
- Swimlane ordering stored per user. The board reads the field's order.
- A board across several schemas at once. A view is one query over one
  schema.
- The satisfaction survey, the calendar client and the budget ceiling,
  the other three D5 revivals. None of them is nextcloud-vue's.
