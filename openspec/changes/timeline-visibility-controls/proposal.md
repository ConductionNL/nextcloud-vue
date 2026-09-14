---
kind: code
---

# Proposal: timeline-visibility-controls

## Summary

One timeline is safe to show a citizen only when every entry says which
side of the counter it belongs on. OpenRegister is adding that flag.
The chip that shows it, the toggle that sets it and the filter chip that
reads it are nextcloud-vue's, because `CnNotesCard` and `CnActivityTab`
are where a fleet app renders a timeline.

OpenRegister's change `timeline-entry-visibility` left this explicitly to
us. Its `tasks.md` task 2.2 reads: "Chip on the notes leaf, toggle for
users with `update`, filter chip on the feed." Its proposal ends the same
way: "the notes leaf shows the flag as a chip and offers the toggle to
users who may set it; the feed offers a filter chip." Nothing in
nextcloud-vue renders any of it today.

Round 4 discovery cluster 13, "The timeline, the note and what can be
searched in it" (`procest/_round4/discovery/build-plan.md` in
ConductionNL/market-intelligence, 2026-09-14). Owner openregister, size
M. Its mechanism line: extend openregister `timeline-entry-visibility`
and `note-edit-history`; dossiq renders. This change is the render half,
and it is written here because the components are here, not in dossiq.

## What it rests on

- **The openregister change itself.** `timeline-entry-visibility` carries
  ledger row 6.15, "Internal or public visibility per timeline entry",
  rated `no`, size S, third of the register's five to build first. Its
  own proving citation: "Zammad 7 `ticket_articles.internal`; osTicket
  thread type N; seven of eight systems"
  (`_round4/compare/promoted-rows-batch3.md`).
- **D6**, relevance-led promotion, which is what admits the timeline
  cluster's members whatever their passer count.

## Verified in this repository

- `src/components/CnNotesCard/CnNotesCard.vue` renders up to five notes
  with author, body and timestamp, and an add-note form. Its props are
  labels, the API base and display limits. There is no visibility prop,
  no chip and no toggle.
- `src/integrations/builtin/activity/CnActivityTab.vue` renders the
  merged feed with type, actor and date filters and cursor paging. There
  is no visibility filter.

So this is an extension of two components that exist, not a new surface.

## What nextcloud-vue builds

- **A chip on every entry.** Internal or public, on a note in
  `CnNotesCard` and on a row in `CnActivityCard`. Internal is the
  default, and an entry with no flag reads as internal.
- **A toggle, offered from `canSetVisibility`.** The host passes whether
  this caller may set visibility on this object. The toggle appears only
  then. The component never decides the permission and never guesses it
  from the current user.
- **The choice at write time.** The add-note form offers internal or
  public before the note is written, so nothing is public by accident and
  then corrected.
- **A filter chip on the feed.** All, internal or public. A caller the
  server serves the public view to sees the filter fixed at public and
  said so, rather than a control that appears to do nothing.

## How dossiq consumes it

dossiq places `CnNotesCard` and the activity tab on its case page and
passes `canSetVisibility` from the answer OpenRegister already gives it
for `update` on the object. Under the dossiq lane, every entry defaults
internal and Berichtenbox and portal messages are public. portaliq reads
`visibility=public` through the subject-scoped reader (ADR-046) and
renders the same components with the toggle absent.

## Affected projects

- `nextcloud-vue`: `CnNotesCard`, `CnActivityTab`, `CnActivityCard`.
- Consumers: dossiq, portaliq, zaakafhandelapp, pipelinq, decidiq, all
  four named as consumers by the openregister change.

## Backward compatibility

`canSetVisibility` defaults to false and the visibility props default to
absent. A host that passes nothing renders today's card and today's feed,
with no chip, no toggle and no filter.

## Theming

Nextcloud CSS variables only. The chip is the library's existing chip; it
takes no colour of its own.

## Existing specs it extends

`notes-mentions-autocomplete` (the notes card and its write path) and the
activity integration the feed renders through.

## Size

S. Two components, one prop each, one chip, one toggle and one filter.

## Dependencies

OpenRegister's `timeline-entry-visibility` must ship the field, the
default, the guard and the `visibility` query parameter. Until it does,
the toggle has nothing to write and the filter has nothing to ask for.
This change is the second half of that one and should be built with it.

## Out of scope

- Storing the flag, defaulting it, guarding it or auditing the change.
  All four are OpenRegister's, in the change this one pairs with.
- Which entries a portal reader may see. ADR-046 and the subject-scoped
  reader decide that on the server.
- Pinning an entry, editing history, and the other members of cluster 13.
  They stay with openregister.
