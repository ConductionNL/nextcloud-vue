# CnFieldCatalogueDialog

Pick attributes from a catalogue kept in folders, as board DqZaaktypeVelden draws "Attribuut kiezen uit de catalogus": the folders on the left with a count each, "All attributes" first; the attributes on the right under their folder, each with its type and, for a shared one, how many places use it; Cancel and Add in the footer.

```vue
<CnFieldCatalogueDialog
	:fields="catalogue"
	:folders="[{ id: 'address', name: 'Address' }, { id: 'finance', name: 'Finance' }, { id: 'shared', name: 'Shared attributes' }]"
	:exclude-ids="alreadyOnTheCaseType"
	usage-label="in {count} case types"
	@select="addAttributes"
	@closing="open = false" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fields` | Array | `[]` | `{ id, name, label?, type?, typeLabel?, folderId?, usageCount? }`. `label` (else `name`) is shown; `typeLabel` (else `type`) is the meta line. |
| `folders` | Array | `[]` | `{ id, name }` in order. A field whose `folderId` names none of them is under `otherLabel`. |
| `excludeIds` | Array | `[]` | Ids left out (already on the record). |
| `multiple` | Boolean | `true` | Checkboxes; `false` gives radio buttons. |
| `loading` | Boolean | `false` | The catalogue is being read. |
| `error` | String | `''` | A read refusal in the server's words, drawn as the dialog's alert ([card notices](./cn-card-notices.md)). |
| `title`, `description` | String | | The dialog title (default "Choose an attribute from the catalogue") and the line under it. |
| `allLabel`, `otherLabel`, `usageLabel`, `confirmLabel` | String | All attributes, Uncategorised, in {count} places, Add | Texts, through the host translate; `usageLabel` takes `{count}` and shows for a count above one. |

## Events

| Event | Payload |
|-------|---------|
| `select` | The chosen fields (an array). |
| `closing` | The dialog asks to close. |
