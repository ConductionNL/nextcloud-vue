# CnFieldHelper

The helper line rendered under a form field: the validation error when there is
one, otherwise the field's description — plus an ⓘ popover carrying the full
text when the description was too long to render inline.

`CnFormDialog` uses this for every auto-generated field, so schema-driven forms
get the behaviour for free. Use it directly when you render your own fields
through the `#form-fields` or `#field-<key>` slots, so a custom form surface
stays consistent with the built-in one.

## Usage

```vue
<template>
  <div v-for="field in fields" :key="field.key">
    <NcTextField
      :label="field.label"
      :model-value="formData[field.key]"
      :error="!!errors[field.key]"
      @update:model-value="value => updateField(field.key, value)" />
    <CnFieldHelper
      :text="field.description"
      :more="field.descriptionLong"
      :help="field.help"
      :label="field.label"
      :error="errors[field.key]" />
  </div>
</template>

<script>
import { CnFieldHelper } from '@conduction/nextcloud-vue'

export default {
  components: { CnFieldHelper },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `String` | `''` | Inline helper text — a field's short description. |
| `more` | `String` | `''` | The full description, revealed in the popover. Empty (and no `help`) means no ⓘ button is rendered. |
| `help` | `String` | `''` | A schema property's `x-help` explanation. Opened in place by the ⓘ button, before `more`; the same text as `more` shows once. |
| `label` | `String` | `''` | The field's label. Names the button "About \{label\}" for screen readers; without it the button is named "Show the full description". |
| `error` | `String` | `''` | Validation error. Replaces the helper text and colours the line. The ⓘ button stays available beside it. |

Nothing renders at all when `text`, `more`, `help` and `error` are all empty. With only `more` set (a schema `x-help` on a field without a description) the line holds just the ⓘ button.

## The toggletip

The ⓘ button is a toggletip: `aria-expanded` reflects whether the explanation is open, Enter, Space and a click toggle it, and Escape closes it with focus back on the button. The opened text is also announced through a polite live region (`role="status"`). It is rendered as text, never HTML, and it stays reachable when the field shows an error, which is when the explanation is needed most. Without `help` and `more` the markup is exactly what it was before these props existed.

## `x-help` and `description`

A schema property's `description` is the short helper line under the field. `x-help` is a separate, longer explanation that is only shown when the user opens it. It is a string, or a map of language codes to strings (`{ "nl": "...", "en": "..." }`), read in the user's language: the exact code, then its base language (`nl_NL` to `nl`), then `en`, then the first entry. [`fieldsFromSchema()`](../utilities/fields-from-schema.md) emits it as `field.help` (`''` when absent); `CnFormDialog` passes `help` and `label` to every field it draws, including the create and edit dialogs of `CnIndexPage`. Any other value type is ignored with one console warning naming the property. `fieldsFromSchema()` takes a `language` option for the map lookup; `CnFormDialog` passes the user's Nextcloud language.

## Where `more` comes from

[`fieldsFromSchema()`](../utilities/fields-from-schema.md) splits any
description longer than 120 characters: `field.description` becomes the first
sentence (or a word-clamped prefix) and `field.descriptionLong` holds the
complete original. Short descriptions pass through untouched with
`descriptionLong` set to `''`, so the ⓘ only appears where it is needed.

Passing `more` a value that equals `text` still renders the button — the
component does not compare them; it trusts the split the resolver already made.

## Styling

The root span carries both `cn-field-helper` and the legacy
`cn-form-dialog__helper` class (with `--error` modifiers on each), so
stylesheets written against the old inline helper span in `CnFormDialog`
continue to apply.
