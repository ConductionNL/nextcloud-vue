# Diagnostics channel

A host app hears, through one function, each request, render error, unknown component and binding problem of the pages the library renders. The library sends nothing anywhere itself.

```vue
<CnAppRoot :manifest="manifest" :diagnostics="(report) => log.push(report)" />
```

`diagnostics` is optional. Without it no report is built and no timing is taken, and the console messages stay as they were. The function is also provided to descendants as `cnDiagnostics`. A listener runs outside the call that caused the report; one that throws is dropped for the rest of the session with a single console warning, and never breaks the page. Two `CnAppRoot` instances in one page each hear every report, each with its own `pageId`.

## Reports

Every report has `kind`, `at` (milliseconds since the epoch) and `pageId` (the current route name, or `null`).

| kind | fields |
|------|--------|
| `request` | `method`, `path`, `status` (`0` when the request did not complete), `durationMs`, `rows` (results of a list, `1` for one object, else `null`), `source` (`store` or `cnFetch`), `objectType` |
| `render-error` | `component`, `message` |
| `unknown-component` | `name`, `where` (`page`, `widget`, `sidebar` or `pageType`) |
| `binding` | `problem` (`missing-property`, `missing-schema` or `missing-register`), `register`, `schema`, `property`, `where` (`column` or `field`) |

`path` keeps the query keys and none of the values: `/api/objects/vergunningen/permit?_search&_limit`.

A binding problem is reported once per page visit. A manifest column key or `includeFields` entry that the schema lacks is `missing-property`; keys that start with `@self.`, hold a dot, or carry `aggregate` or `expression` are skipped.

## What a report never holds

No request or response body, no header, no query value and no user id. The one free text is a render error's message, passed to your function in memory. A render error still travels on to the app's own `errorHandler`.

## Not covered

Requests a widget makes with axios directly, and page load timing.
