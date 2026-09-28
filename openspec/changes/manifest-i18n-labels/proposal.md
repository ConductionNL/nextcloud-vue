---
kind: code
depends_on: []
---

# Proposal: manifest-i18n-labels

## Why

A maker writes an app's labels in Dutch. A colleague whose Nextcloud
speaks English opens it and reads Dutch, because the labels live in the
app's manifest and nothing translates them. The library already routes
most labels through one function, the `translate` a host hands to
`CnAppRoot`. That function looks in the host's own catalogue, where a
maker's labels never are. And some components show a manifest label
without passing it through that function at all.

This change gives the manifest a place for translations, looks labels up
there first, and fixes the components that skip the lookup.

## Rows

No gap row in this lane's list names this. The sibling change waiting on
it is buildiq `experience-multilingual-apps`. Its proposal, section
"Sibling halves":

> nextcloud-vue owes two things. The app manifest schema
> (`src/schemas/app-manifest-v2.schema.json`, `additionalProperties:
> false` at the top level at 2.57.1) needs an `i18n` block, so a manifest
> carrying translations validates. And `CnAppRoot` should resolve a label
> from the manifest's `i18n` for the user's language before it calls the
> host's `translate`, so the builder runtime, the preview and an exported
> app all behave the same. Any component that shows a manifest label
> without `cnTranslate` needs to be listed and fixed there.

Its design D1 fixes the shape: `i18n: {sourceLanguage, languages[],
labels: {<lang>: {<source text>: <translation>}}}`, keyed by the text as
written. Its D2: "`CnAppRoot` (sibling half) looks in
`manifest.i18n.labels[userLanguage]`, then falls back to the host's
`translate`, then to the text itself." Its task T01 asks for all three
parts. Its REQ-BQML-003 and REQ-BQML-004 wait on this.

The row that change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `ux-multilingual-ui` | Offer a built app's interface in several languages. |

## What changes

- The manifest v2 schema gains a top-level `i18n` block:
  `sourceLanguage`, `languages` and `labels`.
- `CnAppRoot` provides as `cnTranslate` a lookup that tries the
  manifest's labels for the user's language, then the host's
  `translate`, then the text as written.
- `CnAppRoot` takes an optional `language` prop, so buildiq's preview
  can show another language than the maker's own.
- The components that show a manifest label without the lookup are
  listed in the design (D4) and fixed: `CnFormPage`, the enum options of
  `cnFormFieldRenderer`, `CnRowActions`, bulk actions in `CnActionsBar`,
  `CnIndexSidebar`, `CnObjectSidebar`, `CnRelatedCollections`,
  `CnSearchPage`, `CnStorePage`, and the walkthrough hand-off in
  `CnAppRoot`.

## Affected projects

- `nextcloud-vue`: the manifest v2 schema, `validateManifestV2`,
  `CnAppRoot`, a new `src/utils/manifestTranslate.js`, and the
  components in D4.
- Consumers: buildiq (runtime, preview, exported apps). Every app gains
  translated labels in the places D4 fixes, through its own `translate`.

## Backward compatibility

A manifest without `i18n` looks up nothing new: the host's `translate`
runs as before. The D4 fixes pass labels through the host's `translate`
where they were shown raw; with the identity default they show the same
text.

## Out of scope

- Translating records. That is OpenRegister's `register-i18n`.
- Schema property titles a page shows without a label of its own.
- A form field's `placeholder`. `CnFormPage` does not show it at all
  (design D4), so there is nothing to translate until a change shows it.
- A language picker inside a built app. The user's Nextcloud language
  decides, as buildiq's proposal says.
