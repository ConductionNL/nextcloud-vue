# CnObjectPartiesWidget

A record's parties, as OpenRegister's party model answers them, grouped by role with the primary party first. Registered under the `parties` widget type for detail pages.

Each party shows its kind, who represents it and the indicators on it. An indicator always carries its verdict, never a bare chip. A blocking verdict (`refuse-publication`, `refuse-send`) is also a note above the list, so nobody publishes or sends past it.

## Content shape

```json
{
  "id": "item-parties",
  "type": "parties",
  "content": {
    "rolesObjects": { "register": "myapp", "schema": "role", "field": "item" },
    "roleLabels": { "applicant": "Applicant", "representative": "Authorised representative" },
    "kindsSource": {
      "url": "/apps/myapp/api/items/@objectId/party-kinds",
      "enforce": "crm",
      "sourceText": { "crm": "Kinds from the CRM", "default": "This app's own kinds" }
    },
    "extraLines": [
      {
        "endpoint": "/apps/myapp/api/items/@objectId/parties/{party}/language",
        "valueLabels": { "language": { "nl": "Dutch", "en": "English" } },
        "lines": [
          { "when": { "field": "stated", "op": "eq", "value": true }, "text": "Writing language: {language}. Asked for by the party." },
          { "text": "Writing language: {language}." }
        ]
      }
    ],
    "correspondence": { "endpoint": "/apps/myapp/api/items/@objectId/documents", "path": "documents" },
    "labels": { "empty": "No parties on this item yet" }
  }
}
```

| Key | Meaning |
|---|---|
| `rolesSource` | The listing. Default `/apps/openregister/api/objects/@register/@schema/@objectId/parties`. |
| `partySource` | One party, `{uuid}` filled in. Default `/apps/openregister/api/parties/{uuid}`. |
| `rolesObjects` | `{ register, schema, field }`: the role rows that say who represents whom (`participant`, `representedParty`). |
| `roleLabels` | The app's word for each role key, through the app's translate. Else the listing's label, else the key. |
| `kindsSource` | `{ url, enforce?, sourceText? }`: the kinds this record accepts, answered as `{ source, kinds }`. A party of another kind is marked, only when `source` is `enforce`. |
| `extraLines` | Lines under each party, one request per party (`{party}` filled in): `path` into the answer, `valueLabels` for its coded values, and `lines`, candidate sentences with an optional local `when`. |
| `correspondence` | `{ endpoint, path?, senderField?, recipientsField? }`: how many documents each party sent and received. |
| `presentation` | `"primary"` draws only the primary party, as a side card does (see below). Default: every party by role. |
| `manage` | `{ add?, remove? }`: let the reader add and remove parties through OpenRegister's party API (see below). |
| `link` | The primary presentation's foot link: `{ label, href? \| tab? }`. `{total}` in the label is the number of parties; `tab` opens that tab of the page through the route hash. Not drawn when the record has no parties. |
| `labels` | Overrides of the words: `failed`, `failedDetail`, `empty`, `emptyDetail`, `accepted`, `primary`, `notAccepted`, `representedBy`, `noPrimary`, `verdictPublication`, `verdictSend`, `verdictWarn`, `sentencePublication` and `sentenceSend` (with `{party}`). |

`@register`, `@schema` and `@objectId` in a URL are the record's.

## The primary presentation

A side card that names one person, such as an organisation's main contact:

```json
{
  "id": "side-main-contact",
  "type": "parties",
  "title": "Main contact",
  "content": {
    "presentation": "primary",
    "roleLabels": { "chair": "Chair" },
    "link": { "label": "All {total} contact persons", "tab": "org-contact-persons" }
  }
}
```

It shows the primary party's initials, name and role label, the correspondence e-mail the listing carries for it as a `mailto:` link, and the foot link. It reads the listing only. Without a primary party it reads `labels.noPrimary` ("No main contact yet").

## Adding and removing parties

```json
"manage": {
  "add": {
    "label": "Add contact person",
    "dialogTitle": "Add contact person",
    "kind": "person",
    "primary": true,
    "sources": [{ "id": "person", "register": "myapp", "schema": "person", "title": "{displayName}" }],
    "create": {
      "register": "myapp",
      "schema": "person",
      "label": "Someone new, without a BSN",
      "fields": [
        { "key": "givenNames", "label": "First names", "path": "name.givenNames", "required": true },
        { "key": "surname", "label": "Last name", "path": "name.surname", "required": true },
        { "key": "email", "label": "E-mail", "type": "email", "address": { "path": "contactAddresses", "kind": "correspondence", "type": "email" } }
      ],
      "compose": { "displayName": ["name.givenNames", "name.surname"] }
    }
  },
  "remove": { "message": "Remove {name} as {role}?" }
}
```

- **Add** opens a dialog. The reader picks somebody known (CnPartyPicker over `sources`) or, with `create`, describes somebody new: each field writes its value at `path`, a field with `address` adds `{ kind, type, value }` to that list (the party's addresses), and `compose` joins paths into a derived field such as the display name. No identifier is asked for. The roles offered are the ones the party kind `kind` accepts, else every role the schema declares, in `roleLabels`' words. `primary: true` offers "make this the primary party", which goes through `PUT .../parties/primary` so the replacement is recorded.
- **Remove** puts a button on every party; after the confirm it takes the party off in that role (`DELETE .../parties/{party}?role=`).
- OpenRegister asks the record's update right on every party write. A reader without it gets "You may not change who is on this record." and nothing changes. The buttons are hidden when OpenRegister's scopes say the reader may not update the schema.
- After a change the widget reads the parties again and sends `cn:page:refresh`, so tab counts and a primary card on the same page follow. The widget reads again on `cn:page:refresh` from elsewhere.
- The primary presentation draws no manage buttons.

## Behaviour

- A failed listing says so ("The parties could not be read") and is never shown as "no parties".
- Each role is a `section` named by its heading.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `objectId` | `String\|Number` | `''` | The record's id. |
| `register` | `String\|Object` | `''` | The record's register slug. |
| `schema` | `String\|Object` | `''` | The record's schema slug. |
