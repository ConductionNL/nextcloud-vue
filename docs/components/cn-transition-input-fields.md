# CnTransitionInputFields

The declared inputs of a transition or an act, drawn wherever the host puts them. [`CnTransitionInputDialog`](./cn-transition-input-dialog.md) draws them in their own dialog; a host that lists several acts and opens the chosen one's inputs in place, under its card, draws them with this component. Both read the same declarations and decide the same way whether the form is complete.

## Import

```js
import { CnTransitionInputFields, readTransitionInputs } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnTransitionInputFields
  v-model="values"
  :inputs="inputs"
  :context="{ pauseReasons }"
  :columns="2"
  :mark-required="false"
  :disabled="busy" />
```

```js
// Whether the form may be confirmed, and what to send.
const { complete, data } = readTransitionInputs(inputs, values, { context: { pauseReasons } })
```

## Input declarations

Every key [`CnTransitionInputDialog`](./cn-transition-input-dialog.md) reads (`field`, `required`, `label`, `options`, `picker`, `fields`), plus:

| Key | Description |
|-----|-------------|
| `widget` | `text`, `textarea`, `number`, `date`, `select` or `template`, whatever the schema says. |
| `optionsSource` | A dot path into `context` holding the rows to pick from, read through `optionValue` (default `value`) and `optionLabel` (default `label`). With no rows the input is hidden and asks nothing. |
| `other` | `{ label, input }`: adds an "Other" entry. The input it names is shown, and asked, only when this picker is hidden or Other is picked. Other is sent as `''`. |
| `helperFrom` | `{ input, key }`: the helper text is `key` of the row picked in that other input, such as the legal basis of a picked reason. |
| `prefillFrom` | `{ input, key }`: picking a row in that other input sets this input to the row's `key`, such as the default days of a picked pause reason. A row without the key, and Other, leave what was typed. |
| `preview` | `{ label, template, note, testid }`: a line under the input once the template resolves. Tokens are `{field}`, `{field\|date}`, `{today\|date}` and `{today+field\|date}` (today plus that many days); a token that resolves to nothing hides the line. The value carries the test id `<testid>-value`. |
| `default` | The starting value (CnTransitionInputDialog seeds it). |
| `description`, `note` | The helper text under the field, and a muted line under it. |
| `labelOutside`, `id` | Draw the label above the field as a `<label for>` tied to the field's id. |
| `wide`, `rows`, `placeholder`, `testid` | Span both columns; the text area's rows (default 4); the placeholder; the control's `data-testid`. |

A `template` input renders [`CnTemplateSelect`](./cn-template-select.md) with its `url`, `schema`, `params`, `mapOption` and `placeholder`, and puts the chosen template's `body` (else `presets.body`) into the input named by `applyTo`. It never writes over text already typed there, and is never sent.

```js
[
  { field: 'pauseReason', optionsSource: 'pauseReasons', optionValue: 'key', optionLabel: 'name',
    required: true, label: 'Reason', other: { label: 'Other', input: 'reason' } },
  { field: 'reason', widget: 'text', required: true, label: 'Reason', labelOutside: true, id: 'act-reason' },
  { field: 'days', widget: 'number', label: 'Days given', helperFrom: { input: 'pauseReason', key: 'legalBasis' },
    preview: { label: 'Comes back on', template: '{today+days|date}' } },
]
```

## Summary and notice

`summary` is a read-only block above the inputs about what the action works on: `{ when, card: { icon, title, meta: [], badge }, title, facts: [{ label, path, fallback }], testid }`. `when`, the card's `title`, `meta` and `badge`, and each fact's `path` are dot paths into `context`; the block shows once `when` resolves. The card and the facts carry the test ids `<testid>-card` and `<testid>-facts`.

`notice` is a tinted box under the inputs: `{ type, heading, text, icon? }`. `type` is `info` (the default), `warning` or `error`; `icon` names a CnIcon (default `InformationOutline`). It is drawn as its own box rather than an `NcNoteCard`, which disappears into the tinted card of a chosen act.

The summary's facts stack each label over its value, whatever Nextcloud's `apps.css` does to `dt` and `dd`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inputs` | Array | `[]` | The declared inputs |
| `modelValue` | Object | `{}` | The values, keyed by field (`v-model`) |
| `schema` | Object | `null` | The object's JSON Schema, for inputs that declare no widget |
| `currentObject` | Object | `null` | The record: `picker.excludeSelf` and the object input's present value |
| `register` | String | `''` | Register the reference pickers fall back to |
| `context` | Object | `{}` | What `optionsSource` and the summary read |
| `fieldErrors` | Array | `[]` | Input keys a refusal named; an unoffered one is reported as a key the action does not accept |
| `disabled` | Boolean | `false` | Locks the inputs, such as while the action posts |
| `columns` | Number | `1` | `2` sets the inputs side by side; `wide` inputs, previews, the summary and the notice span both |
| `markRequired` | Boolean | `true` | Whether a required input's label carries ` *` |
| `summary` | Object | `null` | The read-only block above the inputs |
| `notice` | Object | `null` | The note under the inputs |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | the values | One input changed. Two changes in one tick both survive. |
