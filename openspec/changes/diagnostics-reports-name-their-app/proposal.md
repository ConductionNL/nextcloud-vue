# Diagnostics reports name the app they came from

## Why

The diagnostics channel (`app-diagnostics-channel`) has one set of listeners for
the whole browser page. When two `CnAppRoot`s run in one page, each listener hears
the other app's reports too, and `CnAppRoot` stamps its own `pageId` on them. That
is the case in buildiq's page designer: the designer is a `CnAppRoot` and the live
preview is a second one, so the preview's error log heard the designer's requests
and attributed them to a preview page (buildiq board BqPaginaOntwerperFouten,
buildiq#1121, which worked around it by leaving out buildiq's own API paths).

## What changes

- Every report carries `appId`: the `appId` of the `CnAppRoot` it came from, or
  `null` when the library cannot tell (a `cnFetch` call outside any app).
- A store request is tagged through its pinia: `CnAppRoot` binds its app id to the
  pinia it runs with, and `trackedFetch` reads the app from the store that made
  the request. A preview with its own pinia is told apart from the host.
- A component report (render error, unknown component, binding problem) is tagged
  with the app of the `CnAppRoot` above it, provided as `cnDiagnosticsAppId`; the
  provided `cnDiagnostics` stamps it as well.
- `CnAppRoot` still hands its listener every report, so a host that wants all of
  them keeps them, but it stamps its `pageId` only on a report of its own app or of
  no known app. A listener filters on `report.appId`.
- A report shown once per page visit is once per app.

## Out of scope

- Separate listener sets per app. One channel with a tag keeps the listener API
  unchanged.
