# api-reference Delta: openapi-reference-component

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [openapi-reference-component](../../)

## Purpose

`CnApiReference` shows an OpenAPI 3 document inside the Nextcloud page,
readable from the keyboard, and loads nothing from outside the instance.
The library half of buildiq `operate-api-docs` (its D2 and REQ-BQAD-003);
row `ops-api-docs` (buildiq matrix).

## ADDED Requirements

### Requirement: The reference shows every call of the document

`CnApiReference` SHALL render the `document` prop's `info.title`,
`info.version` and `servers[].url`, SHALL group the calls by their first
tag with untagged calls under "Other", and SHALL show for each call its
method as text, its path and its summary. An opened call SHALL show its
parameters, request body and responses, and each schema SHALL show its
fields with type, required, rules and description. A call's body SHALL
render only once it is opened.

#### Scenario: An integrator reads the permit calls

- GIVEN a document from OpenRegister for register `vergunningen` with schemas `permit` and `applicant`
- WHEN an integrator opens the reference
- THEN they see the groups "permit" and "applicant"
- AND opening "GET /objects/vergunningen/permit" shows its query parameters and the `permit` fields with their types

#### Scenario: A filter finds one call

- GIVEN a reference with 140 calls
- WHEN the integrator types "DELETE" in "Filter calls"
- THEN only delete calls remain and the status line says how many of 140 are shown

### Requirement: The reference loads nothing from outside the instance

`CnApiReference` SHALL make no network request of its own. It SHALL
resolve only `$ref` values that start with `#/`, SHALL show any other
reference as "External reference, not loaded", SHALL stop a reference
cycle with "See above", and SHALL render descriptions as plain text.
Links SHALL pass `safeHref`.

#### Scenario: An external reference stays unloaded

- GIVEN a document whose `address` schema is `{"$ref": "https://example.org/bag.json#/Adres"}`
- WHEN a maker opens the call that returns an address
- THEN the schema shows "External reference, not loaded"
- AND no request to example.org leaves the browser

#### Scenario: A description cannot load an image

- GIVEN a call whose description holds `![x](https://example.org/p.png)`
- WHEN it is shown
- THEN the text appears as written and no image request is made

### Requirement: The reference downloads the document it shows

"Download OpenAPI file" SHALL save the `document` prop as indented JSON
named `<download-name>.openapi.json`, or `<title>-<version>.openapi.json`
without a name, built in the browser without a request. `downloadable:
false` SHALL hide the button. A Swagger 2.0 document SHALL show "This
file is Swagger 2.0. Only OpenAPI 3 is shown here." with the button.

#### Scenario: A maker hands the file to a supplier

- GIVEN a reference for "Vergunningen" version 1.4.0 with `download-name` "vergunningen-1.4.0"
- WHEN the maker clicks "Download OpenAPI file"
- THEN the browser saves "vergunningen-1.4.0.openapi.json" whose `info.version` is "1.4.0"

### Requirement: The reference works from the keyboard

Every call SHALL be a button with `aria-expanded` and `aria-controls`.
The title, tags and calls SHALL form a heading outline. Tables SHALL have
a caption and column headers. The filter status SHALL be announced in a
polite live region. The method SHALL be written as text, never shown by
colour alone.

#### Scenario: A screen-reader user opens a call

- GIVEN a screen-reader user on the reference
- WHEN they move to "POST /objects/vergunningen/permit" and press Enter
- THEN the button reports expanded and focus can move into the request body table
