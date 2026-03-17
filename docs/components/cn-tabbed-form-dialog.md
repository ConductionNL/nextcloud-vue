---
sidebar_position: 42
---

# CnTabbedFormDialog

A generic tabbed dialog for create/edit forms. Provides the standard dialog shell (NcDialog, tabs, notifications, action buttons) while the parent supplies tab content via slots.

**Wraps**: NcDialog, BTabs/BTab, NcButton, NcNoteCard, NcLoadingIcon, NcCheckboxRadioSwitch

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `Array<{ id, title, icon?, disabled? }>` | required | Tab definitions. `icon` is a Vue component reference |
| `item` | `Object\|null` | `null` | Existing item = edit mode; `null` = create mode |
| `dialogTitle` | `String` | `''` | Custom title (overrides auto-generated) |
| `entityName` | `String` | `'Item'` | Used in auto-titles: "Create {name}" / "Edit {name}" |
| `size` | `String` | `'large'` | NcDialog size |
| `showCreateAnother` | `Boolean` | `false` | Show "Create Another" checkbox in create mode |
| `disableSave` | `Boolean` | `false` | Disable primary button (parent controls validation) |
| `successText` | `String` | `''` | Custom success message |
| `cancelLabel` | `String` | `'Cancel'` | Cancel button text |
| `closeLabel` | `String` | `'Close'` | Close button text (result phase) |
| `confirmLabel` | `String` | `''` | Primary button text (default: "Create"/"Save") |
| `createAnotherLabel` | `String` | `'Create another'` | Checkbox label |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | none | User clicked Save/Create. Parent does API call, then calls `setResult()` |
| `close` | none | Dialog should be closed |
| `reset` | none | "Create another" success — parent should clear form data |
| `update:activeTab` | `number` | Tab index changed (supports `.sync`) |

## Slots

| Slot | Scoped Props | Description |
|------|-------------|-------------|
| `above-tabs` | `{ loading }` | Optional content above the tab bar (e.g. metadata grid, detail cards) |
| `tab-{id}` | `{ loading }` | Content for each tab. The `id` comes from the `tabs` prop |
| `actions-left` | `{ loading, isCreateMode }` | Extra content before Cancel button |
| `actions-right` | `{ loading, isCreateMode }` | Extra content after primary button |

## Public Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `setResult` | `{ success?, error? }` | Show result phase. Success auto-closes (2s) or resets in create-another mode |
| `resetDialog` | none | Clear result, reset loading, return to first tab |

## Usage

### Basic (Edit Mode)

```vue
<CnTabbedFormDialog
  ref="dialog"
  :tabs="[
    { id: 'settings', title: 'Settings', icon: Cog },
    { id: 'quota', title: 'Quota', icon: Database },
    { id: 'security', title: 'Security', icon: Shield },
  ]"
  :item="existingItem"
  entity-name="Application"
  :disable-save="!formData.name.trim()"
  @confirm="saveApplication"
  @close="closeModal">
  <template #tab-settings="{ loading }">
    <NcTextField :disabled="loading" label="Name *" :value.sync="formData.name" />
    <NcTextArea :disabled="loading" label="Description" :value.sync="formData.description" />
  </template>
  <template #tab-quota="{ loading }">
    <NcTextField :disabled="loading" label="Storage Quota (MB)" type="number" />
  </template>
  <template #tab-security="{ loading }">
    <RbacTable :authorization="formData.authorization" />
  </template>
</CnTabbedFormDialog>
```

### Create Mode with "Create Another"

```vue
<CnTabbedFormDialog
  ref="dialog"
  :tabs="tabs"
  :item="null"
  entity-name="Organisation"
  :show-create-another="true"
  :disable-save="!formData.name.trim()"
  @confirm="saveOrganisation"
  @close="closeModal"
  @reset="resetForm">
  <template #tab-settings>
    <!-- Form fields -->
  </template>
</CnTabbedFormDialog>
```

### Handling Save Result

```javascript
async saveOrganisation() {
  try {
    const { response } = await store.save(this.formData)
    if (response.ok) {
      this.$refs.dialog.setResult({ success: true })
    }
  } catch (error) {
    this.$refs.dialog.setResult({ error: error.message })
  }
}
```
