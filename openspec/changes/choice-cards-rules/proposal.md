---
kind: code
---

# Proposal: choice-cards-rules

## Summary

learniq's subject choice (SubjectChoicePicker, 673 lines) lets a pupil or guardian pick electives from a plan with live
feedback on the plan's rules (at least, at most, must go together, only one of) and on lesson times that clash.
CnChoiceCards picks several options but checks nothing. It gains `rules`, `rulesMetText` and `clashEndpoint`.

## Scope

CnChoiceCards, docs, jest spec.
