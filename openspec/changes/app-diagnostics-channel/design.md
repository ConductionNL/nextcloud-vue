# Design: app-diagnostics-channel

Read at nextcloud-vue development `3e606bf10`.

## What is there

- `useObjectStore` calls `fetch` directly in nine actions
  (`src/store/useObjectStore.js:526`, `:563`, `:608`, `:678`, `:736`,
  `:812`, `:863`, `:927`, `:1014`). On a failure it keeps the error in
  `errors` and writes it to the console, for example `fetchCollection`
  at `:613-617`. Its plugins in `src/store/plugins/` hold 17 more
  `fetch` calls. No timing is taken anywhere.
- The store already takes host functions through `_options`:
  `configure(options)` merges them (`:208-210`), and
  `organisationUuidGetter` and `languageGetter` are read from there
  (`:317`, `:341`).
- `CnAppRoot` reaches the default store with `useObjectStore()`
  (`src/components/CnAppRoot/CnAppRoot.vue:662`, `:3487`) and provides
  host hooks such as `cnTranslate` and `cnFormatters` from `provide()`
  (`:758`, `:831-834`).
- `cnFetch` is the library's own HTTP client (`src/utils/cnFetch.js:71`,
  `cnFetchJson` at `:97`).
- `CnPageRenderer` warns in the console for a missing custom component
  (`src/components/CnPageRenderer/CnPageRenderer.vue:1087`), an unknown
  page type (`:1095`) and a missing sidebar component (`:1493`).
  `CnWidgetGrid` warns for an unknown `widgetKey` and renders
  `CnUnknownWidget` (`src/components/CnWidgetGrid/CnWidgetGrid.vue:283-297`).
  Nothing in `CnPageRenderer` or `CnAppRoot` catches a render error. The
  only `errorCaptured` in `src/` is `CnSectionBoundary`
  (`src/components/CnBodySections/CnSectionBoundary.js:43`).
- `CnDataTable.getSchemaProperty(key)` returns `{}` for a column key the
  schema lacks (`src/components/CnDataTable/CnDataTable.vue:1170-1172`),
  so a column bound to a removed property renders empty in silence.
  `includeFields` names properties on the index page
  (`src/components/CnIndexPage/CnIndexPage.vue:1949`) and the detail page
  (`src/components/CnDetailPage/CnDetailPage.vue:1057`).
- The manifest's `observability` block
  (`src/schemas/app-manifest-v2.schema.json:331-334`) is read by
  OpenRegister's AppHost, "NOT by the Vue renderer". It is not this.

## Decisions

### D1. One function, one shape

```vue
<CnAppRoot :manifest="manifest" :diagnostics="(report) => log.push(report)" />
```

`diagnostics(report)` receives one plain object. Every report has `kind`,
`at` (milliseconds since the epoch) and `pageId` (the current route
name, or `null`). The kinds:

| kind | fields |
|---|---|
| `request` | `method`, `path`, `status`, `durationMs`, `rows`, `source` (`store` or `cnFetch`), `objectType` |
| `render-error` | `component`, `message` |
| `unknown-component` | `name`, `where` (`page`, `widget`, `sidebar` or `pageType`) |
| `binding` | `problem` (`missing-property`, `missing-schema` or `missing-register`), `register`, `schema`, `property`, `where` (`column` or `field`) |

`path` is the request's path with its query keys and none of its values,
so `/api/objects/vergunningen/permit?_search&_limit`. `status` is the
HTTP status, or `0` when the request did not complete. `rows` is the
number of results of a list, `1` for one object, and `null` otherwise.

Rejected: a Vue event bus. A bus is global, so two roots on one page
would hear each other, and a host has to know the event names.

### D2. The store holds a set of listeners

The store keeps `_options.diagnostics` as a set of functions. `CnAppRoot`
adds its own on `created` and removes it on `beforeDestroy`. A root's
function adds its own `pageId` before calling the host. buildiq mounts a
root inside a root (`BuilderHost`), so both may listen at once, and
neither steals the other's reports.

All store requests go through one private `_request(objectType, url,
init)` that times the call with `performance.now()`, reports, and
returns the response as before. The plugins use it too. `cnFetch`
reports through the same helper in `src/utils/diagnostics.js`, reading
the listener set of the default store.

Rejected: `configure({ diagnostics })` with a single function. The last
root to configure would win.

### D3. Reporting can never break the page

Each listener runs from `queueMicrotask`, inside `try`/`catch`. A
listener that throws is dropped for the rest of the session with one
console warning. With no listener, no report object is built and no
timing is taken. The existing console messages stay.

### D4. Render errors and unknown components

`CnPageRenderer` gains an `errorCaptured` hook that reports a
`render-error` with the component's name and the error's message, then
lets the error travel on as before. It does not swallow it, so an app's
own `errorHandler` still sees it. The four console-warning sites of
"What is there" also report `unknown-component`.

The message stays in the browser. The library passes it to the host's
function in memory and sends it nowhere. buildiq's health reporter keeps
no text (its D3); its debug panel shows it to the maker.

### D5. Binding problems are reported once per page

When `CnIndexPage` or `CnDetailPage` has its schema, it checks each
manifest column key and each `includeFields` entry against
`schema.properties`. A key that starts with `@self.`, holds a dot (a
path into a reference), or has `aggregate` or `expression`, is skipped.
Each missing property is reported once per page visit. A 404 from
`fetchSchema` (`useObjectStore.js:509`) or `fetchRegister` (`:555`)
reports `missing-schema` or `missing-register`.

Rejected: warning in the table itself. A missing column is a maker's
mistake, and an app user cannot fix it. The host decides who sees it.

## Files

- `src/utils/diagnostics.js`: new. The report builder, the path
  cleaner, the listener set and the safe call.
- `src/store/useObjectStore.js`, `src/store/plugins/*.js`: `_request`
  and the listener set in `_options`.
- `src/utils/cnFetch.js`: report through the helper.
- `src/components/CnAppRoot/CnAppRoot.vue`: the `diagnostics` prop, the
  listener, the `cnDiagnostics` provide.
- `src/components/CnPageRenderer/CnPageRenderer.vue`,
  `src/components/CnWidgetGrid/CnWidgetGrid.vue`: `errorCaptured` and
  the unknown-component reports.
- `src/components/CnIndexPage/CnIndexPage.vue`,
  `src/components/CnDetailPage/CnDetailPage.vue`: the binding check.

## Privacy

A report holds no request or response body, no query value, no header
and no user id. The only free text is a render error's message, handed
to the host in memory (D4). The library makes no request for
diagnostics. This keeps buildiq's promise that it stores no user,
message or payload from a running app within reach.
