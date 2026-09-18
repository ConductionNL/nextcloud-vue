---
kind: code
depends_on: []
---

# Proposal: the-activity-tab-reads-the-merged-feed

Gap scan pack c, parity ledger row 10.8 "Timeline export per case or
contact". The open half of openregister `activity-leaf`, whose own task 2.1
names this repository as the owner: "the leaf surfaces come from the library
(`registerLeafIntegrations`, `CnActivityTab`)".

## Why

A handler asking what happened on a case wants one list. What changed, which
document arrived, what the colleague noted, which letter went out, in the
order it happened, with a way to take it with them.

They get two lists and neither is the answer. openregister's audit trail is
one tab and the Nextcloud Activity stream is another, documents and notes
and mail appear in neither, and nothing exports.

openregister built the merge and stopped at the surface, because the surface
is ours.

## What is actually there

Read against `parity/round2`.

openregister shipped the engine. `ActivityFeedMerge` decides order, bounds
and a cursor that is a time rather than an offset, with no database in
sight. `ActivityFeedService` fetches the audit trail it owns and asks the
Activity provider for its rows, and takes files, notes and mail from the
caller that already holds them. Reads are excluded by default, because
fifteen of the seventeen rows on the measured case detail were reads.
`ActivityFeedExport` writes the page it is given as CSV, escaping the cells
a spreadsheet would execute. The engine accepts `kinds`, `from` and `until`
and returns a count per kind.

`CnActivityTab` reads none of it. Its own header says what it is: a
chronological timeline of NC Activity events, from
`/api/objects/{register}/{schema}/{objectId}/activity`, with a type
dropdown, an actor dropdown and a 24h / 7d / 30d / all segmented control.
One source, no kind chips, no reads toggle, no export.

## What this change does

- **The tab reads the merged feed.** `CnActivityTab` calls the merged
  endpoint and pages on the feed's time cursor rather than the Activity
  stream's.
- **A chip per kind, and a chip that reads zero stays.** The engine returns
  a count per kind, so a kind with no rows renders "0" rather than
  disappearing. A chip that vanishes when it is empty tells the reader the
  kind does not exist on this object, which is a different sentence.
- **Reads are off, and the toggle remembers.** The default exclusion is
  openregister's; what belongs here is that a reader who turned reads on
  finds them on next time. Only an audit row can be a read, so a note whose
  action happens to be spelled `read` is still shown.
- **A date range, kept as a range.** The existing segmented control becomes
  `from` and `until`, which is what the engine takes.
- **An export button over the filtered feed.** It exports what is on screen.
  An export that re-queries can disagree with the list beside it and the
  reader cannot tell which one was wrong.
- **A widget surface beside the tab.** A detail page that mounts the widget
  drops its separate audit and version tabs, which is how the same log stops
  appearing in two places.

## What this change does not do

It does not render a PDF. `ExportService::exportToPdf()` renders objects of
a register and a schema, not an arbitrary row set, so a printed feed is a
new renderer and a separate decision about what a printed feed looks like.

It does not enforce access to the feed. Every row is about one object and
carries no rights of its own; whether the reader may see that object was
decided by the read that got them to the tab. A second check here would be a
second answer to a question the platform already answers, and the two would
drift.

## Impact

- `src/integrations/builtin/activity/CnActivityTab.vue` and
  `CnActivityCard.vue`
- A widget surface registered through `registerLeafIntegrations`
- `src/composables/` for the per-user reads memory
- Affected specs: `activity-leaf-surface` (new)
- Size: M
