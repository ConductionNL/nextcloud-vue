# CnChipListManager

An admin card that keeps a list of words as chips. Each word is one OpenRegister object. An administrator adds a word, renames one by double-clicking it (or pressing F2), and deletes one after a confirm. Pipelinq uses it for the shared label list on Beheer, Marketing.

**Wraps**: CnSettingsSection, CnConfirmDialog

## Usage

```vue
<CnChipListManager
  register="pipelinq"
  schema="label"
  :title="t('pipelinq', 'Labels')"
  :description="t('pipelinq', 'The labels people can pick for articles, leads and clients.')"
  rename-url="/apps/pipelinq/api/labels/{id}/rename"
  :note="t('pipelinq', 'Double-click a label to rename it. A deleted label stays on the items that already use it.')" />
```

The server decides who may change the list. A refused write shows as a line in the card and the list stays as it was.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `register` | String | required | OpenRegister register slug or id. |
| `schema` | String | required | OpenRegister schema slug or id; one object per word. |
| `field` | String | `'name'` | The property that holds the word. |
| `title` | String | `''` | The card's title. |
| `description` | String | `''` | The line under the title. |
| `note` | String | `''` | A line under the form. Hidden when read only. |
| `renameUrl` | String | `''` | POST endpoint for a rename, `{id}` filled, body `{ name }`. Without it a rename updates the object. |
| `addLabel` | String | `'New item'` | The label above the new-word field. |
| `placeholder` | String | `'Enter a name'` | The new-word field's placeholder. |
| `submitLabel` | String | `'Add'` | The add button's text. |
| `deleteMessage` | String | says items keep the word | The confirm sentence, `{name}` filled. |
| `readOnly` | Boolean | `false` | Only list the words. |
| `apiBase` | String | `'/apps/openregister/api'` | The OpenRegister API base. |

## Events

| Event | Payload | When |
|---|---|---|
| `changed` | none | After a word was added, renamed or deleted. |

## Behaviour

- The words show in alphabetical order, whatever the case.
- A name the list already has, in any case, is refused before any request.
- Enter saves a rename, Escape drops it, leaving the field saves it.
