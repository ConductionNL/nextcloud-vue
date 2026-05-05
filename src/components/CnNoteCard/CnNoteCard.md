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
