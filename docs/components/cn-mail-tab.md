# CnMailTab

The mail of one record: a row that opens a Nextcloud Mail draft, from a template or empty, above the mail linked to the
record. Registered under the `mail` widget type, for detail pages.

The tab never sends mail. The app's own endpoint creates the draft in Nextcloud Mail and answers where it is; the reader
sends it from Mail. The linked mail below the row is [CnEmailTab](./cn-email-tab.md), with its Link existing email and
Compose in Mail actions.

## Content shape

```json
{
  "id": "case-mail",
  "type": "mail",
  "content": {
    "heading": "Email",
    "description": "Mail linked to this case",
    "hint": "The draft opens in Nextcloud Mail. You send it from there.",
    "templates": {
      "url": "/apps/app/api/types/@object.type/email-templates",
      "responsePath": "results",
      "labelField": "name",
      "idField": "id"
    },
    "noTemplatesText": "No templates for this type yet",
    "draft": {
      "url": "/apps/app/api/records/@objectId/email-templates/{templateId}/draft",
      "blankTemplateId": "blank"
    },
    "closedWhen": { "field": "endDate", "op": "notEmpty" },
    "linkedMail": true,
    "headerActions": ["link", "compose"]
  }
}
```

| Key | Description |
|---|---|
| `heading` | A heading above the row. None by default, since a tab already names the panel. |
| `description` | A line under the heading. |
| `hint` | A line under the row. |
| `templates` | An `endpointSource`-shaped read of the templates: `url` takes the `@objectId` and `@object.<field>` tokens, `responsePath` plucks the list (a `{ results }` body is read too). `labelField` (default `name`) is shown in the select, `idField` (default `id`) goes into the draft URL. Without it the row offers the empty draft only. A failed read leaves the empty draft usable. |
| `noTemplatesText` | The select's placeholder when there are no templates (default "No templates yet"). |
| `draft` | `{ url, blankTemplateId?, blankButton? }`: the POST that creates the draft. `{templateId}` in the URL is the chosen template's id, or `blankTemplateId` (default `blank`) for an empty draft. Without it there is no row. `blankButton: true` keeps the row's Empty draft button beside a `compose` header action (DqZaakEmail). |
| `closedWhen` | A local visibleWhen condition on the record. While it holds, both draft buttons are disabled. |
| `linkedMail` | Show the linked mail under the row (default `true`). Set `false` when the page places the `email` integration as its own card. |
| `headerActions` | Buttons beside the heading, in this order: `"link"` (Link mail) and `"compose"` (Compose mail). None by default. See below. |

`heading`, `description`, `hint` and `noTemplatesText` go through the host's translate.

## Header actions

`headerActions` puts the tab's two main actions beside its heading, as the DqZaakEmail board draws them:

- `"compose"`, **Compose mail** (primary): opens the empty draft through `draft`, as the row's empty-draft button did,
  which then leaves the row. Without `draft` it opens Nextcloud Mail's composer in a new tab. Disabled while
  `closedWhen` holds.
- `"link"`, **Link mail** (secondary): opens the linked mail's picker over the reader's mail; the chosen message is
  linked to the record through OpenRegister's email links, and the list reloads. Needs the linked mail, so it is not
  offered with `linkedMail: false`.

With either button in the header, the linked mail drops its own Link existing email and Compose in Mail buttons.

## The draft response

The draft endpoint answers `{ draftUrl?, unresolved? }`. `draftUrl` opens in a new tab. `unresolved` lists the template
fields the server could not fill; the tab shows them as `{{name}}` in a warning, so the reader fills them in the draft.
Any other failure shows the server's `message` in an error note. A 404 means the app has no Mail to draft into: the tab
then says Mail is not available instead of showing the row.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `objectId` | `String\|Number` | `''` | The bound record's id, for `@objectId` and the linked mail (handed in by the page host). |
| `objectData` | `Object` | `null` | The bound record, for `@object.<field>` and `closedWhen`. |
| `register` | `String\|Object` | `''` | The bound record's register, for the linked mail. |
| `schema` | `String\|Object` | `''` | The bound record's schema, for the linked mail. |

## Events

| Event | Payload | Description |
|---|---|---|
| `drafted` | the draft response | A draft was created. |
