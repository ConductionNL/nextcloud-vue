# manifest-i18n Delta: manifest-i18n-labels

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [manifest-i18n-labels](../../)

## Purpose

An app's manifest carries translations of its labels, and every label
the library shows from a manifest is looked up there for the user's
language first. The library half of buildiq `experience-multilingual-apps`
(its T01, D1, D2, REQ-BQML-003 and REQ-BQML-004); row
`ux-multilingual-ui` (buildiq matrix).

## ADDED Requirements

### Requirement: The manifest accepts an i18n block

The manifest v2 schema SHALL accept a top-level `i18n` object with
`sourceLanguage` (string), `languages` (array of unique strings) and
`labels` (an object mapping a language to an object of written text to
translated text, all strings). `validateManifestV2` SHALL refuse a
`labels` key that is not in `languages`, and a `sourceLanguage` that is
also in `languages`.

#### Scenario: A manifest with translations validates

- GIVEN a manifest with `i18n: { sourceLanguage: "nl", languages: ["en"], labels: { en: { "Vergunningen": "Permits" } } }`
- WHEN `validateManifestV2` runs
- THEN it passes

#### Scenario: A label language that is not declared is refused

- GIVEN a manifest whose `i18n.labels` has `de` while `languages` is `["en"]`
- WHEN `validateManifestV2` runs
- THEN it fails naming `de`

### Requirement: The root looks labels up in the manifest first

`CnAppRoot` SHALL provide as `cnTranslate` a function that, when the
language differs from `sourceLanguage`, returns the manifest's
translation for the language, then for its base language, and otherwise
returns the host `translate` result, which is the written text when the
host has none. The fallback SHALL be per label. The function SHALL read
the live manifest on each call, including the editor's working copy.
`CnAppRoot` SHALL accept a `language` prop, defaulting to the user's
Nextcloud language, and SHALL hand the same function to `CnWalkthrough`.

#### Scenario: A case handler reads English labels

- GIVEN `vergunningen` written in Dutch with English for every label but the column "Kadastraal perceel"
- WHEN a case handler whose Nextcloud language is English opens the permit list
- THEN the menu, the page title and the columns show in English
- AND the one column shows "Kadastraal perceel"

#### Scenario: British English falls back to English

- GIVEN labels for `en` only and a user whose language is `en_GB`
- WHEN the user opens the app
- THEN the labels show in English

#### Scenario: The preview shows another language

- GIVEN a maker whose Nextcloud language is Dutch, and buildiq's preview mounting `CnAppRoot` with `language: "en"`
- WHEN the preview renders the permit list
- THEN its labels are English and the designer around it stays Dutch

### Requirement: Every manifest label passes the lookup

`CnFormPage` (field labels, help, step titles and descriptions, submit
label, success message), the enum and option labels of
`cnFormFieldRenderer`, `CnRowActions` (row action labels and their
toasts), the bulk actions of `CnActionsBar`, `CnIndexSidebar` (title,
column group labels), `CnObjectSidebar` (tab labels, title),
`CnRelatedCollections` (section titles), `CnSearchPage` and
`CnStorePage` (page titles) SHALL show each manifest label through the
injected `cnTranslate`, or through their own `translate` prop falling
back to it. Test ids SHALL stay derived from the written label. A label
shown as its written text in a language other than the source SHALL
carry `lang` set to `sourceLanguage`.

#### Scenario: A form page speaks the user's language

- GIVEN a `type: form` page with the field label "Naam aanvrager" and an English translation "Applicant name"
- WHEN a user with English opens the form
- THEN the field is labelled "Applicant name"

#### Scenario: A row action speaks the user's language

- GIVEN an index page with the row action "Goedkeuren" and the translation "Approve"
- WHEN a user with English opens a row's menu
- THEN the entry reads "Approve" and its test id still ends in "goedkeuren"

#### Scenario: A missing tab translation keeps its source language

- GIVEN a detail page tab "Besluiten" without an English translation
- WHEN a user with English opens the record
- THEN the tab reads "Besluiten" and carries `lang="nl"`
