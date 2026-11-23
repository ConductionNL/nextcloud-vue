# Design: openapi-reference-component

Read at nextcloud-vue development `3e606bf10` and openregister
development as checked out for this pass.

## What is there

- No component in `src/components/` reads OpenAPI. A search for
  `openapi`, `swagger`, `redoc` and `ApiReference` across `src/` and
  `openspec/changes/` finds only a mention of OpenRegister's "Download
  OAS" row action in the archived index-page spec.
- `CnJsonViewer` shows JSON read-only with highlighting
  (`src/components/CnJsonViewer/CnJsonViewer.vue:82-109`: `value`,
  `readOnly`, `height`, `language`). It fits an example body.
- `fieldsFromSchema` and `formatValue` read a JSON Schema property into
  a label, a type and a display value (`src/utils/schema.js:541`, `:141`).
- `safeHref` checks a link's scheme (`src/utils/safeHref.js:49`).
- `triggerBlobDownload` saves a Blob through a temporary object URL
  (`src/components/CnIndexPage/selfModeIO.js:27`).
- OpenRegister serves `GET /api/registers/{id}/oas` and
  `GET /api/registers/oas` (`appinfo/routes.php:1670-1671`). Its paths
  are `/objects/<register>/<schema>` and `/{id}` below it
  (`lib/Service/OasService.php:826`, `:842`, `:867`), and it tags every
  operation with its schema's title (`lib/Service/OasService.php:1253`
  and the operations after it). It
  checks each document against the OpenAPI 3.1 meta-schema
  (`lib/Service/OasService.php:1947`).

## Decisions

### D1. The host hands in the document

```vue
<CnApiReference :document="oas" download-name="vergunningen-1.4.0" />
```

`document` is the parsed OpenAPI object and the only required prop. The
host fetches it, with its own session, from its own instance. `CnApiReference`
makes no request.

Rejected: a `url` prop the component fetches. A URL prop is a way to
point the component at an outside host, which is what buildiq's
REQ-BQAD-003 rules out, and hosts already fetch with their own error
handling.

### D2. The layout

- A header: `info.title`, `info.version`, `info.description`, and each
  `servers[].url` with a copy button. A `#intro` slot lets the host add
  its own lines, such as buildiq's sign-in note.
- `components.securitySchemes` in one sentence each: "HTTP basic",
  "OAuth 2", "API key in header X".
- A list of tags, each a heading with its calls. Calls without a tag go
  under "Other". OpenRegister tags by schema, so a reader sees one group
  per schema.
- A call is a disclosure button with the method as text, the path and
  the summary. Opened, it shows the parameters (name, where, required,
  type, description), the request body and each response (status,
  description, schema).
- A schema is a table of fields: name, type (with `format`, `enum` and
  the item type of an array), required, rules (`minLength`, `maxLength`,
  `minimum`, `maximum`, `pattern`) and description. A nested object
  opens in place.
- "Models" at the end lists `components.schemas`.

A call's body renders only when it is opened, so a register with
thirty schemas and a few hundred calls opens fast.

### D3. Nothing leaves the instance

- `$ref` resolves only when it starts with `#/`. Any other reference is
  shown as the text "External reference, not loaded".
- A reference cycle stops at the second visit with "See above".
- Descriptions render as text with line breaks. Markdown is not
  rendered, because an image in it would load from outside.
- `externalDocs.url` renders as a link through `safeHref` with
  `rel="noopener noreferrer"`. Following it is the reader's choice, not
  a load.
- The component ships no font, icon font or stylesheet from a CDN.

Rejected: embedding Redoc or Swagger UI. Both are large bundles with
their own styles, and both follow external references by default.

### D4. Download from memory

"Download OpenAPI file" saves `JSON.stringify(document, null, 2)` as
`<download-name>.openapi.json`, or `<title>-<version>.openapi.json`
when no name is given, through `triggerBlobDownload`. The file is the
document shown, so what a reader reads and what an integrator receives
are the same. `downloadable: false` hides the button.

### D5. Filter

A search field labelled "Filter calls" narrows the list by path, method
and summary as the reader types. A status line says "12 of 140 calls".
An empty result says "No call matches this filter."

### D6. Versions

`openapi` starting with `3.0` or `3.1` renders. A document with
`swagger: "2.0"` shows "This file is Swagger 2.0. Only OpenAPI 3 is
shown here." and the download button. Anything else shows "This is not
an OpenAPI document."

## Files

- `src/components/CnApiReference/`: new, `CnApiReference.vue`,
  `CnApiOperation.vue`, `CnApiSchema.vue`, `index.js`,
  `CnApiReference.md`.
- `src/utils/openApiModel.js`: new, groups operations by tag, resolves
  local `$ref`, guards cycles, filters. No Vue in it, so it is tested on
  its own.
- `src/components/index.js`, `src/index.js`: exports.

## Security

Every string renders through Vue interpolation, never `v-html`. The
component makes no request of its own (D1, D3). Links pass `safeHref`.

## Accessibility

The title is a heading, tags are the next level, and calls are buttons
with `aria-expanded` and `aria-controls`. The method is written out as
text, not shown by colour alone. Parameter and field tables have a
caption and column headers. The filter status line is a polite live
region. Everything opens and closes from the keyboard.

## Theming

Method badges use the Nextcloud status colours as a border with
`--color-main-text` for the text, so contrast holds in light and dark
themes and under NL Design. Tables use `--color-border` and
`--color-background-hover`. No colour is hard-coded.
