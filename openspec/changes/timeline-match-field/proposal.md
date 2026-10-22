---
kind: code
---

# Proposal: timeline-match-field

## Summary

learniq's pupil dossier timeline (PupilDossierTimelineView, 589 lines) merges a pupil's dossier notes, incidents,
well-being check-ins and care-chain records into one feed. Those rows name the pupil by Nextcloud user id, while the
learner profile page has the profile's uuid, so CnTimelineWidget's `related` (which matches the object's id) finds
nothing. A related source gains `matchField` (a field of the current object to match) and `summaryField`.

## Scope

CnTimelineWidget and timelineEvents, stacked on dq-abstract-w2-timeline-manage. Docs, jest spec.
