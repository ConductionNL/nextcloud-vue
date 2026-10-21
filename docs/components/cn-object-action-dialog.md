# CnObjectActionDialog

Asks an object action's inputs, runs the action and shows what happened. The action is one entry of the list OpenRegister answers for an object ([`useObjectActions`](../utilities/composables/use-object-actions.md)): its `inputs` are a JSON Schema object, drawn by [`CnTransitionInputFields`](./cn-transition-input-fields.md), the same fields [`CnTransitionInputDialog`](./cn-transition-input-dialog.md) draws for a lifecycle transition.

The dialog runs the action itself, on one object or on a selection:

- A refusal keeps the dialog open with the reason and what was typed. A 422 marks the inputs it names. A 409 shows the declared precondition reason.
- A sync run toasts, refreshes the page and closes the dialog.
- An async run (`mode: "async"`) shows that it is running and the steps done so far, then its result.
- A suspended run says it waits for a next step. It never says it is done.
- A run on a selection shows the summary, or that a bulk job started.

## Import

```js
import { CnObjectActionDialog } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnObjectActionDialog
  v-if="pending"
  :action="pending"
  register="zaken"
  schema="decision"
  :objectId="decisionId"
  :currentObject="decision"
  @done="onDone"
  @close="pending = null" />
```

## Inputs from JSON Schema

| Property | Field |
|----------|-------|
| `title` (string or `{ nl, en }`) | the label |
| `required` (on the object) | required, and confirm stays disabled until it is filled |
| `enum` with `x-enum-labels`, or `oneOf` with `const` and `title` | a picker |
| `format: "date"` | a date field |
| `writeOnly: true` | a password field |
| `readOnly: true` or `x-hidden: true` | not asked |
| `default: "@now"`, `"@user"`, `"@object.<path>"` | shown resolved |

An empty optional input is not sent, so OpenRegister applies its declared default.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `action` | `object` | required | The listed action: `key`, `label`, `description`, `inputs`, `confirm`, `mode`. |
| `register` | `string` | required | The register of the object or the selection. |
| `schema` | `string` | required | The schema of the object or the selection. |
| `objectId` | `string\|number` | `''` | The object. Leave empty and pass `ids` for a selection. |
| `ids` | `Array<string>` | `[]` | The selected ids, for a run on a selection. |
| `currentObject` | `object` | `null` | The object, which `@object.<path>` defaults read. |
| `context` | `object` | `{}` | What an input's `optionsSource` reads. |
| `look`, `width`, `eyebrow`, `subtitle` | | | The board-look props every `Cn*` dialog takes. `subtitle` is used when the action has no description. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `done` | result | The action ran. See [`runObjectAction`](../utilities/run-object-action.md) for the result. |
| `close` | | The dialog asks to close. |

Next: let the manifest open it with an action of `type: "object-action"`.
