# CnEditSetupModal

Isolated `NcDialog` (ADR-004 modal isolation) that edits the **first-run setup
wizard** in the working manifest copy (ADR-041): the steps an administrator
walks through the first time an app is opened. All edits mutate the passed
`working` copy **only**.

Reads and writes `manifest.setup`, whose steps the app's setup wizard renders in
order. A step can collect configuration fields or run an action, so the wizard
covers both "tell us this" and "do this for me".

Opened by [CnBuildiqEditButton](./cn-buildiq-edit-button.md)'s "Edit setup
wizard…" item, and mountable on its own surface by any consumer.

## Import

```js
import { CnEditSetupModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose `setup` block is edited in place. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |

## Writing the steps

A setup step is the first prose a new administrator reads, so it takes the same
voice rules as any other user-facing string: say what the step does, start a
task with a verb, and keep a sentence under 16 words. A step whose body merely
restates its own title is not telling the reader anything.
