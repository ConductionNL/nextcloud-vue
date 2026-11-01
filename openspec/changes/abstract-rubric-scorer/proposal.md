---
kind: code
---

# Proposal: abstract-rubric-scorer

## Summary

Ruben, 20 Oct 2026 (LQ-ABSTRACT audit, question 1): marking, peer review and self assessment share one rubric scorer.

learniq scores a record against a rubric in three hand-written views (MarkSubmissionView, PeerReviewMarkingView,
SelfAssessmentView), each with its own copy of the same block: one radio group per criterion, a running total, a
save and a transition. None of the three radio groups has an accessible name. shillinq tender scoring, humaniq
appraisals and decidiq proposal assessment have the same shape.

This change adds the `rubric-scorer` widget (CnRubricScorer).

## Scope

New widget, docs, unit tests. No manifest schema change: widget `content` is free-form. Writes go to OpenRegister's
object and transition endpoints; the server decides, the widget shows a refusal in the server's words.

## Out of scope

Migrating learniq (lane LQ1 does that on its own branch). Weighted totals, comments per criterion.
