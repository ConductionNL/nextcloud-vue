import GeneratedRef from './_generated/CnApiReference.md'

# CnApiReference

Shows an OpenAPI 3.0 or 3.1 document inside the Nextcloud page, for an integrator who has to read an app's API: the records it holds, the calls that read and change them, and the fields they take. OpenRegister writes such a document per register (`GET /api/registers/{id}/oas`); this component renders it without sending the reader to an outside viewer.

```vue
<CnApiReference :document="oas" download-name="vergunningen-1.4.0">
  <template #intro>
    <p>Sign in with an app password.</p>
  </template>
</CnApiReference>
```

## What it shows

- The title, version, description and each `servers[].url` with a copy button, then `components.securitySchemes` as one sentence each ("basicAuth: HTTP basic").
- The calls grouped by their first tag, in first-seen order (OpenRegister tags by schema, so a reader sees one group per schema); untagged calls go under "Other". A call is a disclosure button with the method as text, the path and the summary; opened, it shows its parameters, request body and responses, and each schema as a table of fields (name, type, required, rules, description). A call's body is only built once it is opened, so a register with hundreds of calls opens fast.
- "Models" at the end lists `components.schemas`.
- A "Filter calls" box narrows the list by path, method and summary, with a polite live status ("12 of 140 calls", or "No call matches this filter.").
- "Download OpenAPI file" saves the document as indented JSON, built in the browser, named `<download-name>.openapi.json` (or `<title>-<version>.openapi.json`). `downloadable: false` hides it. A Swagger 2.0 file shows "This file is Swagger 2.0. Only OpenAPI 3 is shown here." with the download button; anything else shows "This is not an OpenAPI document."

## What it never loads

The host fetches the document, with its own session, from its own instance, and hands it in as `document`; the component makes no request. It resolves `$ref` only when it starts with `#/` (any other reference reads "External reference, not loaded"), stops a reference cycle with "See above", renders every description as plain text (Markdown is not rendered, so an image in it cannot load), and passes links through `safeHref`. It ships no CDN font, icon font or stylesheet.

## Accessibility

The title is a heading, tags are the next level and calls the next; each call button carries `aria-expanded` and `aria-controls`. Tables have a caption and column headers. The method is text, not colour alone.

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `document` | required | The parsed OpenAPI 3 document. |
| `downloadName` (`download-name`) | `''` | File name stem for the download. |
| `downloadable` | `true` | Show the "Download OpenAPI file" button. |

## Slots

| Slot | Description |
|------|-------------|
| `intro` | Extra lines under the header, such as how to sign in. |

<GeneratedRef />
