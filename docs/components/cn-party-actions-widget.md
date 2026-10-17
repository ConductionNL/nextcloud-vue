# CnPartyActionsWidget

One band on a contact person's or organisation's page with what to watch out for and the quick actions. Registered under
the `party-actions` widget type, for detail pages.

The boards PqKlant and PqOrganisatie draw it under the page header: "Geen waarschuwingen bij deze inwoner.
Waarschuwing toevoegen" on the left, and Bellen, Mail, Route, Bezoek vastleggen and Bericht sturen on the right. The
contact person and organisation screens in pipelinq, dossiq and shillinq are (almost) the same, so the band is
configuration and nothing in it knows an app.

## Content shape

```json
{
  "id": "party-band",
  "type": "party-actions",
  "content": {
    "indicators": [
      { "id": "aggression", "label": "Aggressive behaviour reported", "tone": "error", "visibleWhen": { "field": "flags.aggression", "op": "eq", "value": true } },
      { "id": "debt", "label": "Outstanding debt: {debt|currency}", "visibleWhen": { "field": "debt", "op": "gt", "value": 0 } }
    ],
    "emptyText": "No warnings for this resident.",
    "emptyActions": [{ "id": "add-warning", "label": "Add warning", "type": "open-form", "variant": "tertiary" }],
    "actions": [
      { "id": "call", "label": "Call", "icon": "Phone", "type": "navigate", "target": "tel:@object.phone", "visibleWhen": { "field": "phone", "op": "exists" } },
      { "id": "mail", "label": "Mail", "icon": "EmailOutline", "type": "navigate", "target": "mailto:@object.email" },
      { "id": "route", "label": "Route", "icon": "MapMarkerOutline", "type": "navigate", "target": "https://www.openstreetmap.org/search?query=@object.address" },
      { "id": "visit", "label": "Log visit", "icon": "MapMarkerCheckOutline", "type": "open-modal", "target": "LogVisit" },
      { "id": "message", "label": "Send message", "icon": "MessageOutline", "type": "open-modal", "target": "SendMessage" }
    ]
  }
}
```

| Key | Description |
|---|---|
| `indicators` | Each `{ id?, label, tone?, icon?, visibleWhen? }`. Shown when its local `visibleWhen` holds against the page object (no condition: always). `tone` is `warning` (default), `error`, `info`, `success` or `neutral`, and picks the pill colour and the default icon; `icon` (an MDI name) replaces it. The label goes through the app's translate and then takes `{field}` tokens from the object (the `fillTemplate` grammar, formats included); a label whose token has no value is left out. |
| `emptyText` | The sentence when no indicator shows, translated. |
| `emptyActions` | Actions beside the empty sentence ("Add warning"). Only drawn when no indicator shows. |
| `actions` | The quick actions at the end of the band. |

`actions` and `emptyActions` are action descriptors as a page's `headerActions` take them, drawn by CnActionButtons:
each needs an `id` and a `label`, and may carry `icon`, `variant` (default `secondary`), `visibleWhen` and any action
type (`navigate`, `open-form`, `open-modal`, `handler`, `api-call`, ...). On a detail page `@object.<field>` tokens
resolve against the record. The quick buttons are 36px, 44px on a phone.

The widget draws its own band, so place it without a card title.
