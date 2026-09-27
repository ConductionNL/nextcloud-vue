---
kind: code
depends_on: []
---

# Proposal: app-diagnostics-channel

## Why

A maker who previews a page in buildiq and sees an empty list has no way
to find out why. The request may have answered 403, a column may point
at a property the schema no longer has, or a component may have thrown.
The library knows each of these. It writes them to the browser console
and tells nobody else. An operator of a live app has the same question
later: how often do its requests fail, and how slow are they. The
library measures nothing.

This change gives the host app one function to listen with. The library
calls it for each request, render error, unknown component and binding
problem. It sends nothing anywhere itself.

## Rows

No gap row in this lane's list names this. The sibling change waiting on
it is buildiq `operate-debug-log-and-monitoring`. Its proposal, section
"Sibling halves":

> nextcloud-vue owes a diagnostics channel. `CnAppRoot` takes an
> optional `diagnostics` function and provides it; the object store
> reports each request (method, path without query values, status,
> duration, row count), the page renderer reports render errors and
> unknown components, and the index and detail pages report a column or
> field whose property the schema lacks. Without a function it does
> nothing.

Its task T01 repeats it: "an optional `diagnostics` prop on `CnAppRoot`,
provided to the store and the page components, with request,
render-error and binding reports and a no-op default." Its design D1
reads both its debug panel and its health reporter from this one
stream. Its REQ-BQDM-001 and REQ-BQDM-002 wait on it.

The rows that change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `lc-debug-log` | Debug a page's queries and bindings in an error log inside the builder. |
| buildiq | `ops-performance-monitor` | Monitor the performance and errors of built apps. |

## What changes

- `CnAppRoot` takes an optional `diagnostics` function and provides it
  to its descendants as `cnDiagnostics`. The default does nothing.
- The object store, its plugins and `cnFetch` report each request:
  method, path with query keys and no query values, status, duration and
  row count.
- `CnPageRenderer` reports a render error in a page, and a page, widget
  or sidebar component it cannot find.
- `CnIndexPage` and `CnDetailPage` report a column or form field whose
  property the schema lacks, and a register or schema that answers 404.
- Every report carries the page id it came from and a time.
- A listener that throws cannot break the page.

## Affected projects

- `nextcloud-vue`: `CnAppRoot`, `useObjectStore` and its plugins,
  `cnFetch`, `CnPageRenderer`, `CnWidgetGrid`, `CnIndexPage`,
  `CnDetailPage`, a new `src/utils/diagnostics.js`.
- Consumers: buildiq (the debug panel and the health reporter). Any app
  may listen.

## Backward compatibility

Without `diagnostics` nothing changes: the console messages stay, no
report is built, and no timing is taken.

## Out of scope

- Sending, storing or counting reports. buildiq does that with what it
  hears.
- Requests a widget makes with axios directly. They do not pass the
  store or `cnFetch`.
- Page load timing. buildiq's proposal does not ask the library for it.
- The manifest's `observability` block. That is read by OpenRegister's
  AppHost on the server, not by the renderer.
