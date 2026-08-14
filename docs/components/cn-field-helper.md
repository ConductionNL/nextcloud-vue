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
| `more` | `String` | `''` | The full description, revealed in the popover. Empty means no ⓘ button is rendered. |
| `error` | `String` | `''` | Validation error. Replaces the helper text, colours the line, and suppresses the popover. |

Nothing renders at all when both `text` and `error` are empty.

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
