# CnNoteBody

The text of one note: plain text, `@mention` chips for users and groups, and images. Nothing else becomes markup, so a note cannot restyle the page: `<b>`, headings and `<img>` tags show as the text they are.

An image is written `![name](url)`. It renders as an image only when its URL is a file of the same record, served by OpenRegister (`.../objects/{register}/{schema}/{id}/files/...`, same origin). Any other image URL renders as a link, so no request goes to a site the note's author chose, and an unsafe URL stays text.

## Usage

```vue
<CnNoteBody
  :message="note.message"
  :record="{ apiBase, register, schema, objectId }"
  :names="{ jan: 'Jan de Vries', 'group/planning': 'Planning' }" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | String | `''` | The raw note text. |
| `record` | Object | `null` | The record the note belongs to, `{ apiBase, register, schema, objectId }`. Only images that are files of this record show as images; `null` shows every image as a link. |
| `names` | Object | `{}` | Display names by id. An unresolved user shows its id as a muted chip; a group shows "Group <gid>" unless `group/<gid>` has a name here. |

## Slots

None.
