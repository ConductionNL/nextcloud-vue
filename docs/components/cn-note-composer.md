# CnNoteComposer

The shared input for writing a note, used by `CnNotesTab` (the sidebar Notes tab) and `CnNotesCard` (the detail-page card).

- **Mentions.** Typing `@` suggests users and groups, from Nextcloud's own autocomplete, so the instance's sharing restrictions apply. A group is stored as `@"group/<gid>"`, the format Nextcloud Comments and Talk use, and shown as a group chip.
- **Images.** An image (`image/*`) pasted or dropped into the box is uploaded to the record's files (`POST .../{id}/filesMultipart`) and its reference, `![name](url)`, is added to the end of the note. Other file types are left alone. Without a record (`register`, `schema` and `objectId`) paste does nothing new. A failed upload says so and leaves the note as it was.
- **Ctrl or Cmd + Enter** emits `submit`.

## Usage

```vue
<CnNoteComposer v-model="text" register="tasks" schema="task" objectId="T1" @submit="save" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String | `''` | The note text (v-model). |
| `placeholder` | String | "Write a note…" | Placeholder shown while the box is empty. |
| `register` | String | `''` | Register slug of the record the note belongs to, for image upload. |
| `schema` | String | `''` | Schema slug of the record. |
| `objectId` | String | `''` | Id of the record. |
| `apiBase` | String | `/apps/openregister/api` | Base URL of the OpenRegister API. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | String | The text changed, including when an image reference was added. |
| `submit` | none | Ctrl or Cmd + Enter was pressed. |
| `uploaded` | `{ name, url }` | An image was uploaded to the record's files. |

## Slots

None.
