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

A field is `text` (the default), `select` (options from `optionsFrom`, the shape a page filter takes), `reference` (a search over `schema`) or `checkbox`. While a required field is empty, or a required checkbox is not ticked, the submit button stays disabled. A `default` may be a `@workspace.<key>` token: the field follows that page filter until the reader changes it. `values` are written with every create, after `@now` and `@workspace.<key>` are resolved. After a create the fields return to their defaults and the widget emits `saved`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | `{ register, schema, fields, values?, submitLabel?, submitIcon?, wideSubmit?, errorMessage? }`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | what the store answered | Emitted after the object is created. |
