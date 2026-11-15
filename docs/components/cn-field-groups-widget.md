# CnFieldGroupsWidget

Several list fields of the current record in one card, each drawn as label and value pairs, with one Add that asks which list. Registered under the `field-groups` widget type.

Board PqKlant "Contactkanalen" lists a resident's e-mail addresses, phone numbers and social profiles in one card: "E-mail, privé" beside the address, "Telefoon, mobiel" beside the number, "Sociaal" beside "Nog geen", and one "Toevoegen" in the title row with a menu of the three. Each list is its own field on the record, so each group is a [`field-list`](./cn-field-list-widget.md) content and saves as one: one PATCH of its own field after re-reading the stored value, a refusal shown in the server's words.

## Content shape

```json
{
  "id": "client-channels",
  "type": "field-groups",
  "title": "Contact channels",
  "content": {
    "add": { "label": "Add", "ariaLabel": "Add channel", "placement": "title" },
    "afterSave": { "url": "/apps/pipelinq/api/contacts-sync/write-back", "body": { "objectType": "client", "objectId": "@objectId" } },
    "groups": [
      {
        "field": "emails",
        "row": { "label": ["Email", { "path": "kind", "map": { "private": "private", "work": "work" } }], "title": "value", "href": { "path": "value", "scheme": "mailto" } },
        "add": { "label": "Email address", "exclusive": ["primary"], "fields": [
          { "key": "value", "label": "Email address", "required": true },
          { "key": "kind", "label": "Kind", "type": "select", "options": [{ "value": "work", "label": "Work" }, { "value": "private", "label": "Private" }] },
          { "key": "primary", "label": "Preferred", "type": "checkbox" }
        ] },
        "edit": true,
        "remove": { "label": "Remove" },
        "mirror": { "field": "email", "path": "value", "prefer": "primary" }
      },
      {
        "field": "socialProfiles",
        "row": { "label": [{ "path": "network", "map": { "linkedin": "LinkedIn" } }], "title": "handle" },
        "add": { "label": "Social profile", "requireOneOf": ["handle", "url"], "fields": [{ "key": "handle", "label": "Handle" }, { "key": "url", "label": "Profile link" }] },
        "emptyLabel": "Social",
        "emptyText": "None yet"
      }
    ]
  }
}
```

| Key | Meaning |
|-----|---------|
| `groups[]` | Field-list contents, drawn in order in the pairs look with one label column. Every field-list key applies (`row`, `add`, `edit`, `remove`, `mirror`, `emptyLabel`, `emptyText`, `afterSave`). `variant`, `add.trigger` and `add.placement` are set by this widget. |
| `add` | `{ label?, ariaLabel?, placement? }`: the one Add, a menu with an item per group that has an `add`, labelled with that group's `add.label`. Choosing an item opens that group's form above its rows and closes any other. |
| `add.placement` | `"title"`: the Add is reported on the `header` event for the card's title row (an outlined button with the menu). Otherwise it is drawn under the groups. |
| `readOnly` | No add, edit or remove in any group. |
| `afterSave` | The field-list `afterSave` for every group that declares none, such as a write-back to Nextcloud Contacts. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `objectData` | `object` | `null` | The current detail-page record; each group reads its list from it. |
| `objectId` | `string\|number` | `''` | The record id, for the PATCH and the `@objectId` token. |
| `register` | `string\|object` | `''` | Register slug of the surface, for the PATCH url. |
| `schema` | `string\|object` | `''` | Schema slug of the surface, for the PATCH url. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `header` | `{ actions }` | The title-row Add with its menu (`add.placement: "title"`), or no actions. |
| `saved` | `{ field, value }` | A group saved its list. |

## Notes

- Content-only on the detail page: the host draws the titled card.
- Renderer only: no config form.
