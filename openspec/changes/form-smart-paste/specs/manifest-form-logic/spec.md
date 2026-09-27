# manifest-form-logic Delta: form-smart-paste

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-smart-paste](../../)

## Purpose

A signed-in user fills a form from pasted text: a registered fill
handler proposes values for the fields the maker allowed, the form
shows them as suggestions, and the user submits. Answers buildiq
`ai-smart-paste-into-forms`, REQ-BQSP-003. Row `ai-smart-paste`
(buildiq matrix).

## ADDED Requirements

### Requirement: Form pages declare smart paste in the manifest

The manifest schemas and `validateManifestV2()` SHALL accept
`config.smartPaste` on `type: "form"` pages with `enabled`, a non-empty
`fields` list, an optional `hint` and a `handler` name. Validation SHALL
fail when a `fields` entry names no key in `config.fields[]`, when
`enabled` is true without a `handler`, and when `enabled` is true on a
page whose `mode` is `public`.

#### Scenario: A removed field is caught

- GIVEN the form page "Nieuwe klant" with `smartPaste.fields: ["naam", "telefoon"]` and no `telefoon` field
- WHEN the manifest is validated
- THEN validation fails with an error naming `telefoon`

### Requirement: The paste control shows only where it may be used

`CnFormPage` SHALL show "Paste to fill" only when `smartPaste.enabled`
is true, the page `mode` is not `public`, the named handler resolves in
the registry, and its availability check, when it has one, reported
true. In every other case it SHALL render the form exactly as before.

#### Scenario: A public form never offers it

- GIVEN a form page in `public` mode whose manifest sets `smartPaste.enabled: true`
- WHEN a visitor opens it
- THEN no "Paste to fill" button is shown

#### Scenario: An unavailable service hides it

- GIVEN a form with smart paste on whose handler reports unavailable
- WHEN a signed-in clerk opens it
- THEN no "Paste to fill" button is shown
- AND the form works as before

### Requirement: Pasted text fills only allowed, empty, visible fields as suggestions

On Fill, `CnFormPage` SHALL call the handler with the pasted text and,
for the allowed fields only, each field's key, label, type and allowed
options, and SHALL NOT pass any value already in the form. It SHALL
write a returned value only into an allowed, visible field that is
empty, or into any allowed visible field when the user chose "Replace
what I typed", and only when the value fits the field's type and passes
the field's validation. Each written field SHALL be marked as a
suggestion until the user edits it or accepts it. The form SHALL NOT
submit on its own.

#### Scenario: A clerk fills a form from an email

- GIVEN the form "Nieuwe klant" with smart paste on `naam`, `adres` and `telefoon`, and `opmerking` not allowed
- WHEN the clerk clicks "Paste to fill", pastes an email signature and clicks Fill
- THEN `naam`, `adres` and `telefoon` show the proposed values, each tagged "Suggested"
- AND `opmerking` stays empty
- AND the form waits for Submit

#### Scenario: A typed value is kept

- GIVEN the clerk already typed "06 1234 5678" in `telefoon`
- WHEN a fill proposes "030 123 4567" and "Replace what I typed" is not ticked
- THEN `telefoon` still shows "06 1234 5678"

#### Scenario: An invalid proposal is skipped

- GIVEN `telefoon` has a validation pattern for phone numbers
- WHEN the handler proposes "see below" for `telefoon`
- THEN `telefoon` is not filled
- AND the notice says one field was skipped
