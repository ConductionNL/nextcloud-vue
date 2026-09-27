---
kind: code
depends_on: []
---

# Proposal: openapi-reference-component

## Why

An integrator who connects a supplier's system to an app needs to read
its API: which records it holds, which calls read and change them, and
which fields they take. OpenRegister already writes that down as an
OpenAPI document per register. Nobody can read it inside Nextcloud.
OpenRegister's own register sidebar sends the reader to an outside
viewer, which cannot reach an instance that is not on the public
internet. The library has no component that shows an OpenAPI document,
so every app that wants one would build its own.

## Rows

No gap row in this lane's list names this. The sibling change waiting on
it is buildiq `operate-api-docs`. Its proposal, section "Sibling halves":

> nextcloud-vue owes the renderer. An OpenAPI reference that renders
> inside the Nextcloud page, with the nextcloud-vue look and keyboard
> access, and fetches nothing from outside the instance, is a shared
> component (`CnApiReference`, name to be settled there): hermiq,
> integriq and openregister's own register sidebar need the same thing.

Its design D2: "The tab renders the cut document with nextcloud-vue's
reference component (sibling half). It never opens an outside viewer."
Its REQ-BQAD-003 asks that the tab render "without loading any page,
script or document from outside the instance". Its task T04 asks for
this change's name.

The row that change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `ops-api-docs` | Get generated API documentation for each built app. |

## What changes

- A new component, `CnApiReference`, renders an OpenAPI 3.0 or 3.1
  document handed to it: the title, version and base address, the calls
  grouped by tag, and per call its parameters, request body and
  responses, with each schema's fields, types and rules.
- It resolves `$ref` inside the document only. It loads nothing from
  outside the instance: no script, no font, no image, no referenced file.
- Descriptions render as plain text.
- A filter box narrows the calls by path, method or summary.
- "Download OpenAPI file" saves the document it shows, from memory.
- The name is settled here: `CnApiReference`.

## Affected projects

- `nextcloud-vue`: new `CnApiReference` and a small `openApiModel.js`
  helper.
- Consumers: buildiq (the app API tab), OpenRegister (the register
  sidebar, instead of the outside viewer), hermiq and integriq as
  buildiq's proposal names them.

## Backward compatibility

The component is new. Nothing else changes.

## Out of scope

- A "try it" console that sends requests from the page. buildiq leaves
  it out too.
- Swagger 2.0. The component says it shows OpenAPI 3 only.
- Cutting a document down to one app's schemas. That is buildiq's
  `appOpenApi.js`.
- A manifest page type or widget for it. buildiq mounts the component in
  its own tab.
