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
| `indicatorSource` | Indicators kept as objects of their own, such as pipelinq's partyIndicatorValue rows: `{ register, schema, filter?, extend?, labelPath, tonePath?, toneMap?, limit? }`. One list request; `@objectId` and `@object.<field>` resolve in `filter` (a filter whose token does not resolve sends no request); `extend` is passed as `_extend`; each row's label is read at `labelPath` and its tone at `tonePath`, through `toneMap` (`{ "high": "error", "low": "info" }`). They are shown after the configured `indicators`. |
| `indicatorSource.url` | Instead of `register`/`schema`: an app endpoint (`@objectId` filled) whose rows are at `itemsPath`. Each row also takes `toneLabels` (a small label per raw tone, "Critical"), a `meta` line of parts (each part a list of templates, the first that fills is used: `[["From {validFrom\|date} until {validUntil\|date}", "Since {validFrom\|date}"], ["Source: {source}"]]`), and `ack` (`{ whenPath, donePath, endpoint, label, seen, errorText }`): an "I have seen this" button where `whenPath` is true and `donePath` empty, which posts to `endpoint` (`{field}` from the row) and reads again; otherwise the `seen` line ("Seen by {acknowledgedBy} on {acknowledgedAt\|date}"). |
| Action targets `@object.<field>\|tel`, `\|mailto`, `\|geo` | The value becomes a `tel:`, `mailto:` or `geo:` link (a phone number keeps its digits and `+`, `00` becomes `+`); the action is left out when the value makes no link. An action label with `{field}` is filled from the record ("Call {phone}"). | These are the manifest schema's `link` tokens (`sentinelLinkToken`), so the manifest validates.
| `indicatorSource.errorText` | Shown as an alert, instead of `emptyText`, when the source cannot be read (default "The warnings could not be loaded."). The indicators are read again when an object is created on the page or on `cn:page:refresh`. |
| `indicatorActions` | Actions beside the indicators, drawn while any shows ("Add a warning"); `emptyActions` take their place while none shows. |
| `emptyText` | The sentence when no indicator shows, translated. |
| `emptyActions` | Actions beside the empty sentence ("Add warning"). Only drawn when no indicator shows. An `open-form` on the indicator schema with `props: { "party": "@objectId" }` creates a warning for this party. |
| `actions` | The quick actions at the end of the band. |

`actions` and `emptyActions` are action descriptors as a page's `headerActions` take them, drawn by CnActionButtons:
each needs an `id` and a `label`, and may carry `icon`, `variant` (default `secondary`), `visibleWhen` and any action
type (`navigate`, `open-form`, `open-modal`, `handler`, `api-call`, ...). On a detail page `@object.<field>` tokens
resolve against the record. The quick buttons are 36px, 44px on a phone.

The widget draws its own band, so place it without a card title.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `objectData` | `Object` | `null` | The page object, passed by the detail page host; indicators read it. |
| `objectId` | `String\|Number` | `null` | The page object's id, for `@objectId` in `indicatorSource.filter`; else the record's `id`. |
