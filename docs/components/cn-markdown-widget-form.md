import GeneratedRef from './_generated/CnMarkdownWidgetForm.md'

# CnMarkdownWidgetForm

Config sub-form for the `markdown` ([`CnMarkdownWidget`](./cn-markdown-widget.md)) widget: one labelled text area. Drives `CnAddWidgetModal` and the cog style editor.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object\|null` | `null` | The placement being edited, or `null` in create mode. |
| `value` | `object` | `{}` | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `{ markdown }` | Emitted on every change. |

`validate()` requires some text.

<GeneratedRef />
