# listUserAddableWidgetTypes

The widget types a **user** may add to their own dashboard, as opposed to the types an administrator may put on a page for everybody.

## Signature

```js
listUserAddableWidgetTypes(surface?: string): string[]
```

## Why it is a separate, smaller list

An administrator configures a widget once, with the register and the schema in front of them. A user has neither and cannot be told about them. A picker that offered a user the administrator's list would offer types they cannot finish configuring, and the failure would arrive as an empty widget on their own dashboard rather than as a refusal they could act on.

So it is an **opt-in**: a type is offerable to a user only when its registry entry declares `userAddable: true`. Anything else — absent, `false`, or a truthy value that is not `true` — is not a declaration and does not opt the type in.

## Usage

```js
import { listUserAddableWidgetTypes, registerDashboardWidget } from '@conduction/nextcloud-vue'

registerDashboardWidget('object-list', { form: ObjectListForm, userAddable: true })

listUserAddableWidgetTypes()               // ['object-list', …]
listUserAddableWidgetTypes('detail-page')  // the detail-page subset
```

It is always a subset of [`listWidgetTypes`](./list-widget-types.md): a user able to add a type an administrator cannot would be a hole rather than a feature. The `surface` filter and the "must have a form" rule both still apply.

## See also

- [`listWidgetTypes`](./list-widget-types.md) — what an administrator may add
- [`userWidgetPresets`](./user-widget-presets.md) — the app's own pre-configured offers
