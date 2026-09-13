---
kind: umbrella
depends_on: []
---

# Proposal: competitor-parity-2026-09

The nextcloud-vue half of the OpenSpec phase of the dossiq competitor
parity programme. Source of record: the gap register at `procest/_gaps/`
in ConductionNL/market-intelligence (`README.md`, `gap-register.md`,
`gap-register.json`, `ownership-rules.md`, written 2026-09-13). Ruben's
rule, from the ownership rules: dossiq reaches 100% comparability with the
competition, and logic that belongs to another app is specified in that
app; dossiq consumes it. nextcloud-vue owns the shared component half, so
this umbrella indexes the components dossiq's parity changes wait on.

Nothing here is implemented. Each indexed change carries its own
`proposal.md`, `design.md`, `specs/` and `tasks.md`.

## The changes

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

## The halves the consuming apps carry

Both changes end at the component. dossiq declares the columns on its
Files tab and the manifest key on its three list pages, and those halves
are specified in dossiq, not here. `scan-verdict-on-the-row` also reads a
Nextcloud platform property, which nextcloud-vue only has to render.
