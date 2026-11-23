# CnCreateFormWidget

The `create-form` widget: a dashboard card that creates one OpenRegister object from the fields its manifest declares, such as the "Aanmelding loyaliteit" card beside the loyalty reporting. It draws on [CnFormWidgetBase](./cn-form-widget-base.md), so it looks like every other form widget, and saves through the object store.

```json
{
  "id": "loyalty-enrollment",
  "type": "create-form",
  "title": "Loyalty sign-up",
  "content": {
    "register": "pipelinq",
    "schema": "customerLoyaltyAccount",
    "submitLabel": "Create loyalty account",
    "submitIcon": "Plus",
    "fields": [
      { "key": "customerId", "label": "Customer", "type": "reference", "schema": "client", "labelField": "name", "required": true },
      { "key": "programmeId", "label": "Programme", "type": "select", "required": true, "default": "@workspace.programme",
        "optionsFrom": { "register": "pipelinq", "schema": "loyaltyProgramme", "labelField": "name", "keepFields": ["termsUrl"] } },
      { "key": "optInTermsVersion", "label": "Terms version accepted", "default": "2026-1" },
      { "key": "optInAccepted", "label": "I agree to store my loyalty data", "type": "checkbox", "required": true,
        "link": { "label": "Read the programme terms", "from": { "field": "programmeId", "path": "termsUrl" } } }
    ],
    "values": { "status": "active", "optInTimestamp": "@now" }
  }
}
```

A field is `text` (the default), `select` (options from `optionsFrom`, the shape a page filter takes), `reference` (a search over `schema`), `checkbox`, `date` or `number` (with an optional `step`, `min` and `max`; it is written as a number). While a required field is empty, or a required checkbox is not ticked, the submit button stays disabled. A `default` may be a `@workspace.<key>` token: the field follows that page filter until the reader changes it. `values` are written with every create, after `@now`, `@workspace.<key>`, and on a detail page `@objectId` and `@object.<field>` are resolved. After a create the fields return to their defaults and the widget emits `saved`.

## A timer

`timer` draws a button beside the submit button, as board DqZaak draws "Timer starten" under "Uren registreren":

```json
{ "timer": { "field": "hours", "unit": "hours", "startLabel": "Timer starten", "stopLabel": "Timer stoppen" } }
```

Start shows the running time. Stop writes the time into `field`: hours with two decimals, or whole minutes with `unit: "minutes"`. The reader can still change it before saving. The time lives on the page until it is stopped, so reloading the page drops a running timer.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | `{ register, schema, fields, values?, timer?, submitLabel?, submitIcon?, wideSubmit?, errorMessage? }`. |
| `objectId` | `string`, `number` | `null` | The record of a detail page, for `@objectId` in `values`. |
| `objectData` | `object` | `null` | The record of a detail page, for `@object.<field>` in `values`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | what the store answered | Emitted after the object is created. |
