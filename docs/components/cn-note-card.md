# CnNoteCard

Inline callout card for informational, warning, success, and error messages. A local patch of `NcNoteCard` from `@nextcloud/vue` that allows customization not possible upstream.

**Wraps**: NcIconSvgWrapper

## Usage

```vue
<!-- Warning (default) -->
<CnNoteCard text="This action cannot be undone." />

<!-- With heading -->
<CnNoteCard type="error" heading="Save failed" text="Please check your input and try again." />

<!-- Success -->
<CnNoteCard type="success" text="Your changes have been saved." />

<!-- Info with slot content -->
<CnNoteCard type="info">
  See the <a href="/docs">documentation</a> for details.
</CnNoteCard>

<!-- Force alert role for time-sensitive messages -->
<CnNoteCard type="warning" :show-alert="true" text="Session expires in 5 minutes." />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | String | `'warning'` | Severity: `'success'`, `'info'`, `'warning'`, `'error'` |
| `text` | String | — | Message text (use the default slot for rich content) |
| `heading` | String | — | Optional bold heading above the message |
| `showAlert` | Boolean | — | Force `role="alert"` — use for messages requiring immediate attention. Always true when `type="error"` |

### Slots

| Slot | Description |
|------|-------------|
| default | Rich message content (replaces `text` prop) |
| `icon` | Custom icon replacing the default severity icon |
