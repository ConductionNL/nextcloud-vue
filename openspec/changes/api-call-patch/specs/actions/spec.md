## ADDED Requirements

### Requirement: An api-call can change only some fields

An `api-call` action with `method: "PATCH"` SHALL send its resolved payload
with the PATCH verb to its url, with the same success, error and refresh
handling as a POST.

#### Scenario: withdrawing a consent
- GIVEN an api-call `{ method: "PATCH", url: "/apps/openregister/api/objects/dossiq/toestemming/c1", payload: { withdrawn: true } }`
- WHEN it is dispatched
- THEN a PATCH with `{ withdrawn: true }` goes to that url and the page refreshes
