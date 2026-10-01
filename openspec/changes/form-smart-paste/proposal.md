---
kind: code
depends_on: []
---

# Proposal: form-smart-paste

## Why

A clerk gets an email with a new customer's name, address and phone
number, and types them into the form one by one. Buildiq lets a maker
allow "fill from pasted text" on a form: the user pastes the email, AI
proposes values for the fields the maker chose, and the user checks
them before submitting. Buildiq authors the setting. The form itself is
drawn by this library's `CnFormPage`, which has no paste control and no
place in the manifest for the setting.

## Rows

The requesting change is buildiq `ai-smart-paste-into-forms`. Its
proposal, section "Sibling halves", names this half:

> nextcloud-vue: the renderer. `CnFormPage` [...] renders `type: form`
> pages and has no paste control. nextcloud-vue owes: `config.smartPaste`
> declared in `src/schemas/app-manifest.schema.json` [...], and a "Paste
> to fill" control in `CnFormPage` that calls the fill endpoint, shows
> the proposals in the fields, and marks them as suggestions.

Its design D4, "What the renderer does, specified for the sibling",
fixes the behaviour: the control shows only when `smartPaste.enabled`
is true, the form is not `public`, and the fill endpoint reports
available; the request carries the pasted text and, per allowed field,
key, label, type and allowed values, never other field values;
proposals fill only empty, visible, allowed fields unless the user
chooses "Replace what I typed"; each filled field is marked as a
suggestion; every proposal passes the field's own validation; nothing
is submitted automatically. D1 gives the shape
`{ "enabled": true, "fields": [...], "hint": "..." }`. Its tasks.md, T04,
asks for "`config.smartPaste` in the manifest schema and the
`CnFormPage` control of D4 [...] Verify: the nextcloud-vue change exists
and cites REQ-BQSP-003."

Rows the requesting change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `ai-smart-paste` | Paste text or a document into a form and have AI fill in its fields. |

Read for this change: the fill endpoint does not exist. The buildiq
change assigns it to hermiq, and hermiq development has no such route
(`appinfo/routes.php` carries `assistant#converse`,
`assistant#detectPii` and the lesson authoring actions) and no open
change for it. So this change does not name a hermiq URL. The form
calls a fill handler the host app registers, the same way it already
calls a registered submit handler.

## What changes

- `config.smartPaste: { enabled, fields, hint?, handler }` on form pages
  in the manifest schemas and the manifest validator.
- `CnFormPage` shows "Paste to fill" when smart paste is enabled, the
  form is not public and the handler says it is available.
- The user pastes text in a dialog. The form passes the text and the
  allowed fields to the handler, and fills the proposals it gets back
  into empty, visible, allowed fields, or into all allowed fields when
  the user ticks "Replace what I typed".
- Each filled field is marked as a suggestion until the user edits or
  accepts it. A proposal that fails the field's validation is not
  filled, and the dialog says how many were skipped.

## Affected projects

- `nextcloud-vue`: `CnFormPage`, a new `CnSmartPasteDialog`, the
  manifest schemas, `validateManifest.js`.
- Consumers: buildiq built apps. Any manifest app with a fill service
  can register a handler.

## Backward compatibility

A form without `config.smartPaste`, or with `enabled: false`, renders
exactly as before. No prop changes meaning.

## Out of scope

- The fill service itself, the model call and its governance. Those are
  hermiq's, through buildiq's registered handler.
- Images and files as input. Text only, as the buildiq change says.
- Recording on the submitted record that a value was suggested by AI.
  The buildiq change does not ask for it.

## Cross-project dependencies

- hermiq owes the fill endpoint with the governed delegate pattern
  (buildiq T05). It does not exist yet.
- buildiq registers the `handler` named in `config.smartPaste` in its
  runtime registry and points it at hermiq's endpoint once that ships.
  Until then the handler reports unavailable and the control stays
  hidden.
