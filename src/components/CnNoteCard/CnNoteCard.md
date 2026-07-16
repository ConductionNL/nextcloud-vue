All four note card types:

```vue
<div style="display: flex; flex-direction: column; gap: 12px;">
  <CnNoteCard type="info" text="This is an informational message with context for the user." />
  <CnNoteCard type="success" text="Your changes have been saved successfully." />
  <CnNoteCard type="warning" text="This action will affect all related records." />
  <CnNoteCard type="error" text="An error occurred. Please try again or contact support." />
</div>
```

With heading:

```vue
<div style="display: flex; flex-direction: column; gap: 12px;">
  <CnNoteCard type="warning" heading="Irreversible action">
    Deleting this record will permanently remove all associated data and cannot be undone.
  </CnNoteCard>
  <CnNoteCard type="info" heading="Tip">
    Use the bulk import feature to add multiple records at once.
  </CnNoteCard>
</div>
```

Custom content via default slot:

```vue
<CnNoteCard type="info">
  <strong>Migration required</strong> — your schema configuration needs to be updated before continuing.
  <a href="#" style="display: block; margin-top: 4px;">View migration guide →</a>
</CnNoteCard>
```

`showAlert` — force the ARIA `alert` role for messages that need immediate user attention (normally only `type="error"` uses the alert role automatically):

```vue
<div style="display: flex; flex-direction: column; gap: 12px;">
  <CnNoteCard
    type="warning"
    :show-alert="true"
    text="Your session is about to expire. Save your work now." />
  <CnNoteCard
    type="info"
    :show-alert="false"
    text="This note uses the default 'note' role." />
</div>
```

Custom icon via `icon` slot — replace the built-in MDI icon with any content:

```vue
<CnNoteCard type="info">
  <template #icon>
    <CnIcon name="LockOutline" :size="20" style="color: var(--color-info-text);" />
  </template>
  This resource is read-only for your account.
</CnNoteCard>
```

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `showAlert` | `Boolean` | `undefined` | When `true`, forces the ARIA `alert` role on the element regardless of `type`. `type="error"` implicitly sets this role even without the prop. Use for warnings that require immediate attention. |

## Slots

| Slot | Description |
|---|---|
| `icon` | Replaces the default type-based MDI icon. Use to render a custom icon or component in the leading position. |
| default | The note card body content. When provided, overrides the `text` prop. |
