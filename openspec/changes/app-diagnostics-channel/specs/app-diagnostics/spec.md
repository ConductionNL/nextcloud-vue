# app-diagnostics Delta: app-diagnostics-channel

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [app-diagnostics-channel](../../)

## Purpose

A host app hears, through one function, each request, render error,
unknown component and binding problem of the pages the library renders.
The library sends nothing anywhere. The library half of buildiq
`operate-debug-log-and-monitoring` (its T01, REQ-BQDM-001 and
REQ-BQDM-002); rows `lc-debug-log` and `ops-performance-monitor`
(buildiq matrix).

## ADDED Requirements

### Requirement: The app root takes an optional diagnostics function

`CnAppRoot` SHALL accept an optional `diagnostics` function and SHALL
provide it to descendants as `cnDiagnostics`, with a default that does
nothing. Every report SHALL be a plain object with `kind`, `at` and
`pageId`. Each listener SHALL run outside the call that caused the
report, and a listener that throws SHALL NOT break the page. Without a
function, the library SHALL build no report and take no timing.

#### Scenario: An app without a listener behaves as before

- GIVEN an app whose `CnAppRoot` has no `diagnostics`
- WHEN a list request answers 500
- THEN the console message appears as today and no report is built

#### Scenario: A broken listener does not break the list

- GIVEN a `diagnostics` function that throws on every call
- WHEN a user opens an index page
- THEN the rows show, and one console warning says the listener was dropped

### Requirement: Every store and cnFetch request is reported

Each request made by `useObjectStore`, its plugins, or `cnFetch` SHALL
report `kind: "request"` with `method`, `path` with its query keys and
no query values, `status` (`0` when it did not complete), `durationMs`,
`rows` and `source`. No report SHALL hold a request or response body, a
header, a query value or a user id. Two `CnAppRoot` instances in one
page SHALL each receive the reports, each with its own `pageId`.

#### Scenario: A maker sees a refused list request

- GIVEN buildiq's preview listening with `diagnostics`, on the index page `permits`
- WHEN the list request answers 403 after 120 ms
- THEN the function receives `{ kind: "request", method: "GET", status: 403, pageId: "permits" }` with a duration near 120 and a path ending in `/permit?_limit&_page`

#### Scenario: A search term does not leave in a report

- GIVEN a user searching "Jansen" on an index page
- WHEN the list request is reported
- THEN the report's path holds `_search` and not "Jansen"

### Requirement: Render errors and unknown components are reported

`CnPageRenderer` SHALL report `kind: "render-error"` with the component
name and the error message when a descendant throws while rendering, and
SHALL let the error propagate as before. A custom component, page type,
sidebar component or `widgetKey` that cannot be resolved SHALL report
`kind: "unknown-component"` with its name and where it was named.

#### Scenario: A widget that throws is reported and still handled

- GIVEN a dashboard whose widget `kpi-omzet` throws in render
- WHEN the page renders
- THEN the function receives a `render-error` naming the component
- AND the app's own `errorHandler` still receives the error

### Requirement: Binding problems are reported once per page visit

`CnIndexPage` and `CnDetailPage` SHALL report `kind: "binding"` with
`problem: "missing-property"` for each manifest column key or
`includeFields` entry that is not in the schema's properties, skipping
keys that start with `@self.`, hold a dot, or carry `aggregate` or
`expression`. A 404 on the schema or register SHALL report
`missing-schema` or `missing-register`. Each problem SHALL be reported
once per page visit.

#### Scenario: A column points at a property that is gone

- GIVEN the index page `permits` with a column `kvkNumber`, and schema `permit` without that property
- WHEN a maker opens the preview
- THEN the function receives one `binding` report with `property: "kvkNumber"`, `schema: "permit"` and `where: "column"`
