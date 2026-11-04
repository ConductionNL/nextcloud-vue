---
sidebar_position: 28
---

# CnMarkdownEditor

Markdown editor with a textarea + live HTML preview, a formatting toolbar, and three layout modes (`edit` / `split` / `preview`).

Pragmatic MVP using `<textarea>` + `cnRenderMarkdown`. A richer TipTap-based WYSIWYG editor is tracked as a follow-up. The contract (props, events, methods) is forward-compatible: when the WYSIWYG path lands consumers will opt in via a new `mode` value without changing their `v-model` binding.

## Try it

```vue
<template>
  <CnMarkdownEditor
    v-model="article"
    v-model:mode="mode"
    placeholder="Write your article…"
    hint="Supports Markdown. Use the toolbar or Ctrl+B / Ctrl+I." />
</template>

<script>
import { CnMarkdownEditor } from '@conduction/nextcloud-vue'

export default {
  components: { CnMarkdownEditor },
  data() { return { article: '', mode: 'split' } },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | String | `''` | v-model. Markdown source. |
| `modelValue` | String | `undefined` | The same value under Vue 3's v-model name. `v-model` binds THIS, not `value` — both are accepted. |
| `mode` | `'edit'\|'split'\|'preview'\|'wysiwyg'` | `'split'` | Layout mode. Use `.sync` or `v-model:mode` to bind. `wysiwyg` mounts a lazily-loaded Toast UI rich editor; the other modes use the textarea + preview. |
| `placeholder` | String | `'Write Markdown…'` | Textarea placeholder. |
| `ariaLabel` | String | `'Markdown editor input'` | Textarea aria-label. |
| `rows` | Number | `10` | Minimum textarea rows. |
| `disabled` | Boolean | `false` | Disables the textarea (preview still renders). |
| `hideToolbar` | Boolean | `false` | Hide the formatting toolbar. |
| `hideModeSwitch` | Boolean | `false` | Hide the toolbar's mode-cycle button. |
| `modeSwitchTooltip` | String | `'Cycle layout …'` | Tooltip for the mode-cycle button. |
| `toolbar` | `Array<{id,label,prefix,suffix?,placeholder?,tooltip?,linePrefix?}>` | default 8 | Custom toolbar entries. `linePrefix: true` prefixes the line instead of wrapping. |
| `hint` | String | `''` | Helper text rendered under the editor. |
| `wysiwygToolbar` | `Array<Array<string>>` | default groups | WYSIWYG mode only: Toast UI toolbar layout (array of button groups). Ignored in the textarea modes. |
| `wysiwygHeight` | String | `'300px'` | WYSIWYG mode only: editor height (any CSS length). |
| `variables` | `Array<string\|{name,label?,description?}>` | `[]` | Variables the text may use as `{name}`. Given, an insert menu and the unknown-variable check appear. |
| `unknownVariableText` | String | `''` | Message for unknown variables; `{names}` becomes the list. Defaults to "Unknown variable: {names}." |
| `insertVariableText` | String | `''` | Name of the insert menu. Defaults to "Insert variable". |

> **Why two props.** Vue 3 compiles `v-model="x"` to `:modelValue` + `@update:modelValue`. A component declaring only `value`/`input` never receives the prop and its emit is never heard — silently. `value` is kept as the public name for existing consumers; `modelValue` is what a plain `v-model` binds, and both emit on every change.


## Variables

Board PtMailsjablonen edits a mail template whose text may use only the variables the template allows. Pass them as `variables`.

```vue
<CnMarkdownEditor
	v-model="body"
	:variables="[{ name: 'naam', label: 'Naam' }, { name: 'zaak', label: 'Zaak', description: 'zaak.nummer, zaak.titel' }]"
	unknownVariableText="Onbekende variabele: {names}. Niet opgeslagen."
	@unknown-variables="names => { blocked = names.length > 0 }" />
```

- The **Insert variable** menu writes `{name}` at the caret. It shows in the edit, split and WYSIWYG modes, and is hidden when the editor is disabled.
- The editor reads every `{name}` and `{name|format:arg}` in the text, the form `fillTemplate` (`utils/fillTemplate`) fills. A name that is not listed shows under the editor as an alert, for example "Unknown variable: {besluit}.". A dotted name is allowed under its listed start, so `{zaak.nummer}` passes when `zaak` is listed.
- `unknown-variables` emits the unknown names when they change. The editor does not block anything itself: the host decides not to save, and says so in `unknownVariableText`.
- Without `variables` the editor checks nothing and shows no menu.

## WYSIWYG mode

Set `mode="wysiwyg"` to opt into a rich Toast UI editor. It is **lazily loaded** — `@toast-ui/editor` and its CSS are imported only when that mode is first active, so the textarea modes carry no editor dependency. The `v-model` contract is identical across all modes (`value` in, `input` out).

```vue
<CnMarkdownEditor v-model="article" mode="wysiwyg" />
```

## Toolbar entry shape

```js
{
  id: 'bold',
  label: 'B',                 // shown on the button
  prefix: '**',
  suffix: '**',
  placeholder: 'bold',        // text dropped when selection is empty
  tooltip: 'Bold (Ctrl+B)',
  linePrefix: false,          // true = prefix the current line, no suffix
}
```

## Default toolbar

Bold (Ctrl+B), Italic (Ctrl+I), H1, H2, Link, Inline code, List, Quote.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | String | v-model emit on every text mutation. |
| `update:mode` | `'edit'\|'split'\|'preview'` | Mode-cycle button. |
| `unknown-variables` | `string[]` | The unknown variables in the text changed; empty when all are known again. |

## Public methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `insertAtCaret(text)` | `(text: string)` | Drop text at the current caret (no markdown wrapping). Useful from file-picker callbacks. |

## Follow-up

A WYSIWYG mode backed by TipTap is tracked in [`nextcloud-vue#286`](https://github.com/ConductionNL/nextcloud-vue/issues/286) follow-ups. The intent is to add a `mode: 'wysiwyg'` value that swaps the textarea for a TipTap editor while keeping `v-model` semantics. Consumers can wire this when it lands without touching their template.

## See also

- [`cnRenderMarkdown`](../utilities/cn-render-markdown.md) — drives the preview pipeline.
