# Design: form-smart-paste

Read at nextcloud-vue development `3e606bf10`, buildiq's
`ai-smart-paste-into-forms` change on buildiq development, and hermiq
`appinfo/routes.php` on hermiq development.

## What is there

- `CnFormPage` resolves a registered function by name from the
  `cnCustomComponents` registry CnAppRoot provides
  (`src/components/CnFormPage/CnFormPage.vue:288-297`,
  `effectiveCustomComponents` at `:463-465`) and calls it on submit
  (`submitViaHandler`, `:912-919`). A missing handler warns and throws.
- `mode` is `edit`, `create` or `public` (`:351-355`).
- Field visibility comes from `isFieldVisible(key)` (`:690-692`). Per
  field validation is `validateFieldValue(field, value, translate)`
  (`src/utils/formValidation.js:91`), already run before Next and
  Submit (`CnFormPage.vue:724-728`).
- Field values live in `formData` and change through `updateField`
  (`:821-822`); the dispatched payload is `effectivePayload`
  (`:569-577`).
- The runtime validator's form case checks `fields[]`, the dispatch
  destination, `submitMethod` and `mode`
  (`src/utils/validateManifest.js:1252-1281`). The v2 schema types form
  config keys under `pages[].config`
  (`src/schemas/app-manifest-v2.schema.json:2831-2848` for `fields`).
- hermiq development has no fill route. Its assistant routes are
  `assistant#converse` and `assistant#detectPii`, and its governed AI
  delegate is `lessonAuthoring#*` (hermiq `appinfo/routes.php:550`,
  `:556`, `:652-655`).

## Decisions

### D1. The fill is a registered handler, not a URL

`config.smartPaste.handler` names an entry in the same registry as
`submitHandler`. The entry is either a function or an object:

```js
{
  fill: async (text, fields) => ({ values: { naam: 'Jansen BV', telefoon: '030 123 4567' } }),
  available: async () => true,
}
```

`fields` is `[{ key, label, type, options }]` for the allowed fields
only, where `options` holds an enum field's allowed values. A bare
function is treated as `fill` with no availability check. The form
never builds the argument from anything but the allowed fields and the
pasted text.

Rejected: `config.smartPaste.endpoint`, a URL the form posts to. The
endpoint does not exist, and its governance (switched off by default, a
data protection acknowledgement, an allowlist, one log line per call)
belongs to the service. A handler lets buildiq wire hermiq's route when
it ships without a library release, and lets another app use another
service.

### D2. When the control shows

"Paste to fill" shows above the fields only when `smartPaste.enabled` is
true, `mode` is not `public`, the handler resolves, and `available()`
(when given) resolved true at mount. A handler that is missing, throws
or reports false hides the control and warns once in the console. A
`public` form never shows it, whatever the manifest says.

### D3. The dialog

`CnSmartPasteDialog` (`src/dialogs/`, an `NcDialog`) has a text area
with `smartPaste.hint` as its description, a "Replace what I typed"
checkbox, and Fill. While the handler runs, Fill shows a spinner and
the text area stays editable. A handler error shows its message in the
dialog and fills nothing.

### D4. How proposals land

For each key in the returned `values`:

1. Skip it unless the key is in `smartPaste.fields`, the field is
   visible, and the field is empty or "Replace what I typed" is ticked.
2. Coerce it to the field's type: `number` to a finite number, `boolean`
   from true or false, `enum` only when it equals one of the options,
   `string` as text. Other types (`file`, `json`, `password`, and the
   device and scan types) are never filled.
3. Run `validateFieldValue`. A failing value is skipped.
4. Write it with `updateField` and mark the key as a suggestion.

The dialog closes and a notice says "3 fields filled, 1 skipped". A
suggestion mark is a "Suggested" tag with an Accept button beside the
field; typing in the field or pressing Accept clears it, and "Accept
all" clears every mark. Marks are not part of the payload. Submit stays
a user action; nothing submits on its own.

Rejected: showing proposals in a side list for the user to copy. The
buildiq design wants the values in the form, where the field's own
validation and labels apply.

### D5. The manifest shape and its checks

`config.smartPaste` is typed in the v2 schema as
`{ enabled: boolean, fields: string[] (minItems 1), hint?: string,
handler: string }` with `additionalProperties: false`, and described in
the v1 page `config` description. The runtime validator adds, in its
form case: every `fields` entry names a key in `config.fields[]`,
`handler` is a non-empty string when `enabled` is true, and `enabled`
with `mode: "public"` is an error. Buildiq's own validator keeps its
richer checks (its D2).

## Files

- `src/components/CnFormPage/CnFormPage.vue`: the control, the landing
  rules, the suggestion marks.
- `src/dialogs/CnSmartPasteDialog.vue`: new.
- `src/schemas/app-manifest-v2.schema.json`,
  `src/schemas/app-manifest.schema.json`: `smartPaste`.
- `src/utils/validateManifest.js`: the form case checks.

## Security and privacy

Only the pasted text and the allowed fields' key, label, type and
options go to the handler. Values the user already typed never do. The
form does not store the pasted text. A proposal is inserted as a field
value and rendered by the field component as text, never as HTML. The
library does not call a model; whatever the handler calls is governed
where it lives.

## Accessibility

"Paste to fill" is an `NcButton` with text. The dialog's text area has
a label. The fill result is announced in a polite live region. The
"Suggested" tag is text, not colour alone, and its Accept button names
the field ("Accept suggestion for Telefoon").

## Theming

The suggestion tag uses `--color-primary-element-light` with
`--color-primary-element-light-text`. No hard-coded colours.
