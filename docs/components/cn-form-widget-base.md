import GeneratedRef from './_generated/CnFormWidgetBase.md'

# CnFormWidgetBase

The abstract form-shaped dashboard widget. It owns the **shape** of a form widget — a stack of labelled fields, a right-aligned action row, one inline error line — and no domain logic at all: no schema, no endpoint, no save.

A concrete form widget declares its `fields`, holds its own model, and does its own submitting. What it gets back is a rendering identical to every other form widget's, because the markup and the CSS live in one place (`src/css/form-widget.css`).

Extracted from `CnInteractionFormWidget`, whose rendering is the reference. The extraction had to be invisible, and `e2e/interaction-form-widget.e2e.js` screenshots the widget to prove it: the PNGs taken before and after are byte-identical.

## Usage

```vue
<CnFormWidgetBase
  block-class="cn-my-form-widget"
  :fields="fields"
  :model="form"
  :errors="{ subject: subjectError }"
  :can-submit="canSave"
  :submitting="saving"
  :submit-label="t('myapp', 'Save')"
  :error-message="errorMessage"
  @update:field="({ key, value }) => (form[key] = value)"
  @submit="onSave" />
```

## Field descriptors

Each entry in `fields` is `{ key, label, type }` plus per-type extras:

| `type` | Renders | Extras |
|--------|---------|--------|
| `select` | `NcSelect` | `options` (`[{ value, label }]`), `clearable`, `optionValue`, `optionLabel` |
| `textarea` | a labelled `<textarea>` | `rows` |
| `text` (default) | `NcTextField` | `inputType` |

Any field also takes `visible: false` to omit it and `disabled: true` to freeze it.

## Replacing one control

A field whose control the base has no type for — a resource picker, a date range — keeps its place, its wrapper and the stack's spacing through the `field-{key}` slot:

```vue
<template #field-client="{ value, update }">
  <CnResourceSelect :model-value="value" @update:modelValue="update" />
</template>
```

## Keeping an existing widget's class names

`blockClass` mirrors a second BEM block onto every element (`cn-my-form-widget__field` alongside `cn-form-widget__field`). Pass it when moving an existing widget onto the base so app CSS written against the old names keeps matching.

## The host owns the state

The base never writes into `model`. It emits `update:field` with `{ key, value }` and the host applies it — which is what lets a widget do something on change (stream a value into a page-level workspace context, say) rather than only store it.

<GeneratedRef />

## Submit labels

`submitLabel` is the button's resting label; `submittingLabel` replaces it while `submitting` is true, and the button is disabled for exactly as long as that stays true.
