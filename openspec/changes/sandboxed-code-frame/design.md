# Design: sandboxed-code-frame

Read at nextcloud-vue development `3e606bf10`, and buildiq
`pages-custom-code` as it stands in buildiq's `openspec/changes/`.
Security rules from hydra ADR-005 and ADR-054.

## What is there

- A `type: custom` page resolves `page.component` (or `page.slots.main`)
  against the custom-component registry and nothing else
  (`src/components/CnPageRenderer/CnPageRenderer.vue:1073-1090`). There is
  no way to render code that the manifest carries.
- A widget resolves its `widgetKey` against the consumer registry, then
  `BUILT_IN_WIDGETS` (`src/components/CnWidgetGrid/CnWidgetGrid.vue:245-258`,
  `src/components/CnWidgetGrid/builtInWidgets.js:74`).
- The widget entry is closed: `"additionalProperties": false`
  (`src/schemas/app-manifest-v2.schema.json:1301`). It has `props` and no
  `config`, so buildiq's "`config.code` ... on a widget" has no place to
  land yet.
- A column renders through `CnCellRenderer` with `col.formatter` and
  `col.widget` (`src/components/CnDataTable/CnDataTable.vue:205-214`). Column
  objects are open (`app-manifest-v2.schema.json:2887-2899`), so an
  `expression` key validates today and does nothing.
- `CnDataTable` is the table of both the index page
  (`src/components/CnIndexPage/CnIndexPage.vue:428`) and a detail page's
  related collections (`src/components/CnObjectListWidget/CnObjectListWidget.vue:141`,
  mounted through `CnRelatedCollections` at
  `src/components/CnDetailPage/CnDetailPage.vue:642`).
- A form field's visibility is computed locally with
  `evaluateVisibleWhenLocal` (`src/components/CnFormPage/CnFormPage.vue:493-511`,
  `src/utils/visibleWhen.js:230`). The shared `visibleWhen` definition is
  closed (`app-manifest-v2.schema.json:2349-2351`).
- `CnChatPage` embeds a frame with a `sandbox` prop whose default is
  `allow-scripts allow-same-origin allow-forms allow-popups`
  (`src/components/CnChatPage/CnChatPage.vue:188-190`). That fits Talk on
  its own origin. For a same-origin document it would let the frame lift
  its own sandbox. `CnCodeFrame` must not copy it.
- `useObjectStore.saveObject()` updates a record with a `PUT` under the
  session of the person using the page (`src/store/useObjectStore.js:801`).
- The public entry exports site blocks only (`src/public/index.js`), and
  `npm run check:public-safe` keeps it that way.

## Decisions

### D1. Where code sits in the manifest

```json
{ "type": "custom", "config": { "code": { "html": "...", "css": "...", "js": "...", "inputs": ["object"] } } }
```

```json
{ "id": "plattegrond", "widgetKey": "code", "slot": "body", "gridX": 0, "gridY": 0, "gridWidth": 12, "gridHeight": 6,
  "code": { "html": "...", "css": "...", "js": "...", "inputs": ["object"] } }
```

`code` is `{ html, css, js, inputs }`, with `inputs` a subset of
`object`, `rows`, `route` and `user`, as buildiq's D1 says. On a page it
lives in `config.code`. On a widget entry it is a typed `code` block, and
`widgetKey` is the built-in key `code`. A `code` widget needs an `id`, so
the host can serve its document by name. `validateManifestV2` refuses
`config.code` beside `component`, a `code` block on any other widget key,
and a `code` widget without an `id`.

Expressions: `columns[].expression`, `expressionDefault` on a form field
and `expression` inside a form field's `visibleWhen`. buildiq's proposal
says "`expression` on `formField` defaults"; its D1 and REQ-BQCC-002 say
`expressionDefault`. This change follows D1. `visibleWhen.expression` is
refused outside form fields, so it cannot validate into a no-op on a
widget.

Rejected: code inside `props` of an ordinary widget. `props` is open and
untyped, so buildiq's save check and this library's validator could not
find code reliably.

### D2. The host serves the document, the library never writes it

`CnAppRoot` gains `codeFrameUrl`, a function
`({ appId, pageId, widgetId, kind }) => string`, with `kind` either
`component` or `evaluator`. buildiq passes one that returns its D2
routes. `CnCodeFrame` loads the URL only when it is same-origin with the
page and its scheme passes `safeHref`. Without a resolver, without a
signed-in user, or on a URL that fails the check, it renders the
placeholder "Code for this part cannot run here." and creates no frame.

Rejected: `srcdoc` or a `blob:` URL built from the manifest. Both
documents inherit the host page's content security policy. Nextcloud's
policy blocks inline script without its nonce, so the maker's script
would not run. Loosening the host policy to let it run would loosen it
for the whole page.

### D3. The sandbox is one fixed value

The frame is `<iframe sandbox="allow-scripts" referrerpolicy="no-referrer">`
with no `allow` attribute. The value is a constant in `CnCodeFrame`, not
a prop. Each token left out, and why:

| token left out | what the frame cannot do, and why it matters |
|---|---|
| `allow-same-origin` | It gets an opaque origin. It cannot read the page, cookies, storage or the request token, and its own requests carry no session. With both `allow-scripts` and `allow-same-origin`, a same-origin frame can remove its own sandbox. |
| `allow-top-navigation`, `allow-top-navigation-by-user-activation`, `allow-top-navigation-to-custom-protocols` | It cannot move the person off the app. Moving goes through `navigate`. |
| `allow-popups`, `allow-popups-to-escape-sandbox` | It cannot open a window outside the sandbox. |
| `allow-forms` | It cannot submit a form, for example a fake login. |
| `allow-modals` | It cannot raise `alert`, `confirm`, `prompt` or print dialogs that look like the app's own. |
| `allow-downloads`, `allow-pointer-lock`, `allow-presentation`, `allow-orientation-lock`, `allow-storage-access-by-user-activation` | None is needed to draw a part of a page. |

No `allow` attribute means no camera, microphone, location or clipboard
permission is delegated.

### D4. What the frame may reach, and what stops the rest

The frame reaches what the page posts into it, and nothing else. What
stops the rest, in layers:

1. The sandbox of D3: no session, no page, no top window, no popups.
2. buildiq's document policy (its D2): no `connect-src`, images only as
   `data:`, no forms. So the frame cannot fetch or send.
3. The host page's own `frame-src`, which is Nextcloud's. A frame can
   always navigate itself, and no policy inside the frame stops that.
   What stops it leaving the instance is the host page's `frame-src`,
   checked by the browser before the request goes out. The library adds
   no frame domain. An app that widens `frame-src` widens where a code
   frame can go, so no app mounting `CnCodeFrame` may add `*` (ADR-054
   Rule 4 sets the same line for `frame-ancestors`).
4. The page watches for a second `load` on the frame. A second document
   means the code navigated its frame. The page then stops posting,
   removes the frame and shows "This part stopped because it tried to
   open another page."

The page hands in only the inputs the manifest declares (D5), so even a
frame that does leave carries nothing it was not given.

### D5. Inputs are data the person can already see

| input | what the page posts |
|---|---|
| `object` | the record the detail page shows, as the store returned it |
| `rows` | the rows the page already loaded for its register and schema with its filters, at most one page |
| `route` | `{ name, params, query }` of the current route |
| `user` | `{ id, displayName }` from `getCurrentUser()` |

Each value is copied through a JSON round trip, so no function, proxy or
token crosses. `user` is for display. The page never trusts a user id
coming back (ADR-005). Inputs are posted on connect and again whenever
one of them changes, for example after a `setField` reloads the record.

### D6. The message protocol and the check on every message

Page to frame, after the frame's first `load`:

- `{ type: "connect", channel, protocol: 1, theme }`, where `channel` is
  a random id made for this mount and `theme` is D8.
- `{ type: "inputs", channel, data }`.
- For the evaluator: `{ type: "evaluate", channel, batch, items }`, each
  item `{ key, expression, scope }`.

The page posts with target origin `"*"`, because an opaque origin has no
name to target. That is why every message holds only what D5 allows.

Frame to page: `navigate`, `notice` and `setField` from a code frame,
and `values` from the evaluator. On every `message` event the page
checks, in order, and drops the message on the first failure:

1. `event.source` is this frame's own `contentWindow`. Every sandboxed
   frame has the same origin string, so the origin alone cannot tell two
   frames apart.
2. `event.origin` is the string `"null"`, the opaque origin. Any other
   origin means the frame is not sandboxed as expected. The page removes
   the frame and logs it.
3. `event.data` is a plain object, at most 64 KB as JSON, whose
   `channel` is this mount's id and whose `type` is allowed for this
   frame kind.

Then each request is checked on its own:

- `navigate { page, params }`: `page` is a page id in the manifest,
  `params` holds only that route's parameters as strings. The page calls
  `router.push`. There is no URL form.
- `notice { text }`: plain text, cut at 200 characters, at most one every
  two seconds per frame, shown as a toast. Never HTML.
- `setField { field, value }`: allowed only when the frame has an
  `object` input. `field` is a property of the record's schema that is
  not `readOnly`, and `value` matches the property's type. The record id
  comes from the page, never from the message, so the frame cannot pick
  which record it writes. The page writes with `saveObject` under the
  person's own session, so OpenRegister applies their rights. A refusal
  shows the toast "You cannot change this record." and the record stays
  as it was. One `setField` at a time per frame.

The frame-side runtime, also library code, answers only messages whose
`event.source` is `window.parent` and whose `channel` matches the one
from `connect`.

### D7. The frame side ships in the library

The library builds two scripts without imports:
`dist/code-frame/frame-runtime.js` and `dist/code-frame/evaluator-runtime.js`.
buildiq inlines them into the documents its route serves, before the
maker's code. The frame runtime exposes `cn.inputs`, `cn.onInputs(fn)`,
`cn.navigate(page, params)`, `cn.notice(text)` and
`cn.setField(field, value)` to maker code.

Rejected: each host writes its own frame side. Two halves of one
protocol in two repositories drift, and a drifted frame side is where a
check goes missing.

The evaluator compiles each expression with `new Function` over
`row` or `values`, `user` and `route`, in strict mode, and answers
`{ key, value }` or `{ key, error }`. A value that is not JSON is an
error. Compiling text that arrives by message needs `'unsafe-eval'` in
the evaluator document's script policy. buildiq's D2 allows inline script
only, so its evaluator route needs that one addition. Inside an opaque
origin with no `connect-src`, `eval` reaches nothing inline script could
not.

### D8. The frame gets the page's colours

`connect` carries the computed values of `--color-main-text`,
`--color-main-background`, `--color-primary-element`,
`--color-primary-element-text`, `--color-border` and `--font-face`. The
frame runtime sets them on its own `:root`, so maker CSS can use
`var(--color-primary-element)` and follows dark mode and an NL Design
theme. A theme change posts `connect` values again.

Rejected: letting the frame read the page's styles. That needs
`allow-same-origin`.

### D9. One evaluator per page, with a time budget

`useExpressionEvaluator()` is provided per page by `CnPageRenderer`. It
creates its frame on the first expression and not before. `CnDataTable`
and `CnFormPage` send one batch per render: the visible rows times the
expression columns, or the form's expression fields. A batch that has no
answer after one second counts as timed out: the page removes the frame,
the cells in that batch render empty with a marker, and the next render
gets a fresh frame.

A thrown error renders the same marker, a small icon with the tooltip
"Could not compute this value". A `visibleWhen.expression` that fails
hides the field, the fail-safe `visibleWhen` already uses. An
`expressionDefault` is computed when the form opens and when an answer it
reads changes, until the person types in that field.

The limit, stated plainly: in a browser that runs the frame on the
page's own thread, an endless loop in an expression freezes the tab until
the browser stops the script. The page cannot interrupt a script on its
own thread. Browsers that isolate sandboxed frames in their own process
are not affected.

Rejected: evaluating expressions in the host page with a parser. A
parser is a second language to secure, and it is not what the maker
wrote.

## Files

- `src/components/CnCodeFrame/`: new, `CnCodeFrame.vue`, `index.js`,
  `CnCodeFrame.md`.
- `src/codeFrame/protocol.js`: message types and the checks of D6,
  shared by the component and the tests.
- `src/codeFrame/frameRuntime.js`, `src/codeFrame/evaluatorRuntime.js`:
  new, built to `dist/code-frame/` by `rollup.config.js` and exported in
  `package.json`.
- `src/composables/useExpressionEvaluator.js`: new.
- `src/components/CnPageRenderer/CnPageRenderer.vue`: `config.code` on
  custom pages, the evaluator provide.
- `src/components/CnWidgetGrid/builtInWidgets.js`,
  `src/utils/libraryWidgetKeys.js`: the `code` widget key.
- `src/components/CnDataTable/CnDataTable.vue`: expression columns.
- `src/components/CnFormPage/CnFormPage.vue`, `src/utils/visibleWhen.js`:
  `expressionDefault` and `visibleWhen.expression`.
- `src/components/CnAppRoot/CnAppRoot.vue`: the `codeFrameUrl` prop,
  provided as `cnCodeFrameUrl`.
- `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifest.js`:
  the keys and the refusals of D1.
- `src/components/index.js`, `src/index.js`: export `CnCodeFrame`. Not
  `src/public/index.js`.

## Security

This is the whole change, so the rules are listed once more with their
source:

- No maker code runs in the host page (buildiq REQ-BQCC-003). The
  evaluator never runs in the page (D9).
- The sandbox value is fixed at `allow-scripts` (D3).
- Every message from a frame is checked for source, origin, channel,
  size and type, and each request against the manifest and schema (D6,
  buildiq REQ-BQCC-004).
- Identity comes from the session on the server, never from the frame
  (ADR-005). The frame never chooses the record it writes.
- No new public surface: code does not render on public pages, and the
  library adds no endpoint (ADR-054 Rule 1 does not come into play).
- Errors shown to the person are fixed sentences, never the frame's own
  message (ADR-005).

## Accessibility

The frame has a `title`: the widget's title, else the page title, else
"Custom content". Tab moves into the frame and out again. What the maker
draws inside is the maker's to make accessible; the buildiq editor says
so. Toasts from `notice` use the library's toast, which is a status
region. The expression marker has hidden text as well as a tooltip.

## Theming

The frame gets the page's colour and font variables (D8). The
placeholder and stopped states use `--color-text-maxcontrast` on
`--color-background-hover`.
