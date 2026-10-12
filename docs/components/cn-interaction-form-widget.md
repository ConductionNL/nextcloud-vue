# CnInteractionFormWidget

The `interaction-form` widget: the quick-log form of a workspace page. It saves a contact moment (channel, client, subject, summary, outcome) to OpenRegister through the object store. It reads `selectedClient` from the page's workspace context to pre-fill the Client field and, unless `content.writeWorkspace` is `false`, writes `selectedClient` and `activeSummary` back so sibling widgets react: a client list filtered on `@workspace.selectedClient`, or a [CnKbSearchWidget](./cn-kb-search-widget.md) bound to `activeSummary`.

The widget registers itself as the `interaction-form` type, so a manifest places it by that key. It is also a named export:

```js
import { CnInteractionFormWidget } from '@conduction/nextcloud-vue'
```

Every schema, field and enum choice comes from `content`, so the widget carries no app vocabulary. The Client field is a resource select that offers to create a client that does not exist yet. The outcome options come from the target schema's enum for `outcomeField` (labels from `x-enum-labels`); `outcomes` is only a fallback. With `detailRoute` set, a save adds an Open button that opens the saved object in a new tab. `defaults` stamps fixed fields on every create (for a required discriminator the form has no input for); the mapped fields win over it.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | `{ register, schema, defaults?, clientSchema, clientField, clientLabelField?, subjectField?, summaryField, channelField?, outcomeField?, channels?, outcomes?, submitLabel?, detailRoute?, writeWorkspace? }`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | the saved object | Emitted after the contact moment is saved. |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnInteractionFormWidget.md'

<GeneratedRef />
