---
kind: code
---

# Proposal: screens-action-resolve

## Summary

Board PqProject has "Cyclus sluiten": a button on a programme that closes the programme's OPEN cycle, a record the page
does not hold. An `api-call` or `navigate` action gets a `resolve` block naming a register, schema and filter; the
first match is looked up before the action renders (to disable it with a reason, or hide it, when there is none) and
again before it runs, and its fields are `@resolved.<field>` in the url, target and payload.

## Scope

`utils/actionResolve.js` (over `fetchReferenceObjects` and `resolveFilterTokens`, no new fetcher), the dispatcher,
the `@resolved` token in the filter grammar, CnActionButtons, `$defs/action.resolve` (schema 2.112.0), docs, tests.
