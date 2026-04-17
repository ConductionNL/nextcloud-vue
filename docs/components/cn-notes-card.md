# CnNotesCard

Inline notes widget for detail pages. Fetches notes from the OpenRegister API, shows the most recent entries (up to `maxDisplay`), and includes an add-note form. Author names are wrapped with `CnUserActionMenu` for quick communication. Own notes show a delete button on hover.

**Wraps**: CnDetailCard, CnUserActionMenu

## Usage

```vue
<CnNotesCard
  register-id="uuid-register"
  schema-id="uuid-schema"
  object-id="uuid-object"
  @note-added="refreshSidebar"
  @note-deleted="refreshSidebar"
  @show-all="openSidebarNotesTab" />
```

Pass pre-translated labels when your app handles i18n:

```vue
<CnNotesCard
  register-id="reg"
  schema-id="schema"
  object-id="obj"
  :title-label="t('myapp', 'Notes')"
  :add-note-label="t('myapp', 'Add note')"
  :no-notes-label="t('myapp', 'No notes yet')"
  :show-all-label="t('myapp', 'Show all')" />
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `registerId` | String | ✓ | — | OpenRegister register UUID |
| `schemaId` | String | ✓ | — | OpenRegister schema UUID |
| `objectId` | String | ✓ | — | Object UUID |
| `apiBase` | String | | `'/apps/openregister/api'` | Base URL for OpenRegister API calls |
| `maxDisplay` | Number | | `5` | Maximum number of notes to show before the "Show all" footer link appears |
| `collapsible` | Boolean | | `false` | Whether the card supports collapse/expand |
| `titleLabel` | String | | `'Notes'` | Card title |
| `addNoteLabel` | String | | `'Add note'` | Submit button label |
| `addNotePlaceholder` | String | | `'Write a note...'` | Textarea placeholder |
| `noNotesLabel` | String | | `'No notes yet'` | Empty state text |
| `showAllLabel` | String | | `'Show all'` | Footer link label |
| `deleteLabel` | String | | `'Delete note'` | Accessible label for the delete button |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `note-added` | — | Emitted after a note has been successfully created |
| `note-deleted` | — | Emitted after a note has been successfully deleted |
| `show-all` | — | Emitted when the "Show all" footer link is clicked |
