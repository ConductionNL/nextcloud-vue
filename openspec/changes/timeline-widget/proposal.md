---
kind: code
---

# Proposal: timeline-widget

## Summary

A library widget type `timeline` (`CnTimelineWidget`) that shows an object's
dated events in time order on a detail page. It merges the object's own date
properties, related objects, the audit trail and OpenRegister's timeline of
notes and messages. From Ruben's pipelinq review of 2026-10-06, item E6.

## Motivation

dossiq built its own case timeline (`case-timeline-pane`, `CaseTimelineTab`)
because the library had no timeline widget; its registry entry says it is
"deleted the day the library ships a timeline widget type". Pipelinq's
booking page needs the same thing next: created, deposit cleared,
confirmation mail sent, starts, ends. Today it hand-builds that list and
shows an audit trail widget beside it.

## Affected projects

- [ ] `nextcloud-vue`: `CnTimelineWidget`, `src/utils/timelineEvents.js`,
      registration as `timeline` (detail-page surface and v2 built-in).
- [ ] `pipelinq`: the booking detail page uses it next (separate PR).
- [ ] `dossiq`: can replace the read-only half of `CaseTimelineTab` with
      `timeline: true`; the composer, pin and follow-up stay app-specific
      until OpenRegister's timeline writes have a library widget.

## Design notes

**Config, not code.** `content.fields` names the date properties
(`[{ field, label }]`, dotted paths reach `@self.created`).
`content.related` names related objects by schema and the property that
points back (`[{ schema, field, dateField?, label, titleField? }]`).
`auditTrail: true` and `timeline: true` add the other two sources.

**One source failing is said, not hidden.** Each source loads on its own. A
failed one shows a warning naming it, and the rest still render, because a
shorter history presented as complete is wrong.

**Upcoming in words.** A moment after now gets a hollow dot and the word
"Upcoming", so the state does not rest on styling alone.

**Read-only.** dossiq's composer, pin and follow-up write to OpenRegister's
timeline sub-resource and stay in the app.
