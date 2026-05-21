# CnWidgetFormRenderer

`CnWidgetFormRenderer` is the built-in v2 widget that exposes
[CnFormPage](./cn-form-page.md) to the manifest layer. It's a
transparent pass-through — `register`, `schema`, and all
form-relevant props are forwarded.

## Import

```js
import { CnWidgetFormRenderer } from '@conduction/nextcloud-vue'
```

## Manifest usage

Referenced via `widgetKey: "form-renderer"`:

```json
{
  "id": "source-form",
  "slot": "body",
  "widgetKey": "form-renderer",
  "gridWidth": 12,
  "props": {
    "register": "openconnector",
    "schema": "source"
  }
}
```

`CnFormPage` renders the full form surface (header, fields, submit
button). Because it's embedded inside a grid cell here rather than
mounted as a top-level page, consumer apps should set appropriate
grid dimensions (typically `gridWidth: 12` for a full-width form).

## Props

All props are forwarded to `CnFormPage` — see the
[CnFormPage docs](./cn-form-page.md) for the full surface. The
commonly used ones in manifest widgets are:

| Prop | Type | Description |
| --- | --- | --- |
| `register` | `String` | Register slug for form data submission. |
| `schema` | `String` | Schema slug for the form's field generation. |
| `item` | `Object` | Pre-fill the form with an existing object (edit mode). |
| `disabled` | `Boolean` | Render the form read-only. |
| `submitHandler` | `Function` | Optional override that receives `(formData)` instead of the default save flow. |
| `submitEndpoint` | `String` | Override the POST/PUT URL used by the default submit handler (overrides `register`/`schema` derivation). |
| `submitMethod` | `String` | HTTP method for the submit (`POST` or `PUT`). Defaults to `POST` for create, `PUT` when `item` is set. |
| `title` | `String` | Optional form title rendered above the fields. |
| `description` | `String` | Optional descriptive text rendered under the title. |
| `initialValue` | `Object` | Initial form values (alternative to `item`; merged with the schema's defaults). |

## Events

Forwarded to `CnFormPage`. The widget surface keeps `@save`,
`@cancel`, etc. usable from the manifest consumer.

## Spec

- REQ-MVR-007 (manifest-v2-renderer) — built-in widget: form-renderer
