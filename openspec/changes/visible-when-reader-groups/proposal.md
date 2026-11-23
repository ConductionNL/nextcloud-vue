---
kind: code
---

# Proposal: visible-when-reader-groups

## Summary

A `visibleWhen` condition can ask about the record, an endpoint or an OpenRegister query, but not about the reader. The only reader-shaped rule a header action has is `adminOnly`. This change adds a `readerGroups` key to the shared `visibleWhen` grammar: the condition holds when the reader is in at least one of the listed Nextcloud groups. Combined with a field condition under `all`, a header action shows only to the people who may run it, in the state where it applies.

It hides a control. It is never an authorization decision: the endpoint behind the action keeps its own check, as with `adminOnly`.

## Motivation

dossiq's advice request page (`BezwaarAdviceRequestDetail`, dossiq#5109 and the screens PR that moved its status actions to `api-call`) offers "Start deliberation", "Issue advice" and "Declare inadmissible". Only bezwaarcommissie members and administrators may run them (Awb 7:13); dossiq's transition endpoint refuses everyone else with a 403. With visibility by status alone, a case handler sees all three buttons and gets an error toast on each. The manifest cannot say "members of these groups only".

Prior art in the library already reads the reader's groups:

- `isWidgetVisible()` / `filterWidgetsByVisibility()` in `src/utils/widgetVisibility.js` gate a dashboard widget on `visibility.groups`, through the cached OCS lookup `getCurrentUserGroups()`.
- `@myGroups` (`nextcloud-group-surfaces`) resolves to the same group ids for filters.

Neither reaches `visibleWhen`, which is what header actions, detail widgets, side cards, tabs and form fields evaluate.

## Proposed shape

```json
"visibleWhen": {
  "all": [
    { "readerGroups": ["bezwaarcommissie", "admin"] },
    { "field": "status", "op": "eq", "value": "in-deliberation" }
  ]
}
```

- `readerGroups: string[]` holds when the reader is in at least one listed group. Nextcloud's administrators are the `admin` group, so "members or admins" needs no second key.
- On its own it is the whole condition; next to `field` / `endpoint` / `source` in one object, both must hold (the way `appInstalled` already gates a mode).
- Until the reader's groups are known, the condition is false, so the control stays hidden rather than flashing on and off. A failed group lookup also reads false (the grammar is already fail-safe).
- It is decided without a request per element: one cached group lookup per page load, shared with `widgetVisibility.js` and `@myGroups`.

## Alternatives considered

- **An app endpoint with `endpoint` mode** (`{ "endpoint": "/apps/dossiq/api/...", "field": "allowed" }`). Works today, but every app writes its own "may I" route, the action stays on screen while that request is pending (CnActionButtons evaluates header predicates in order), and the rule lives in two places.
- **A `groups` key beside `adminOnly` on the action.** Narrower: it would serve header actions only, while tabs, side cards and fields evaluate `visibleWhen`.

## Scope

- `src/utils/visibleWhen.js`: `readerGroups` precondition in `evaluateVisibleWhen()` and `evaluateVisibleWhenLocal()`, `isLocallyDecidableVisibleWhen()` counts it as local (the sync evaluation reads the cached groups reactively, false until they arrive).
- `src/utils/widgetVisibility.js` / `userGroupsPeek.js`: reuse the cached lookup, no new request.
- `src/schemas/app-manifest-v2.schema.json`: `readerGroups` on the visibleWhen definition.
- a new `docs/utilities/visible-when.md` page and the CnActionButtons docs.

## Affected projects

All consumers keep working unchanged: the key is new and optional. dossiq adopts it first on `BezwaarAdviceRequestDetail`; pipelinq and shillinq have header actions with the same "only this team" need.

## Backward compatibility

Additive. A manifest without `readerGroups` evaluates exactly as before. An older library that does not know the key ignores it, so the control shows as it does today and the endpoint still refuses.
