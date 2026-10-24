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
