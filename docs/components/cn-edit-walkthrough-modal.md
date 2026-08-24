# CnEditWalkthroughModal

Isolated `NcDialog` (ADR-004 modal isolation) that edits the **guided
walkthrough** in the working manifest copy (ADR-041): the spotlighted tour an
app runs on a user's first visit. All edits mutate the passed `working` copy
**only**.

Reads and writes `manifest.walkthrough`, whose `tours[].steps[]` the runtime
renders in order. Each step spotlights a target (a page, a nav item, an element)
and advances on a real signal: a route match, an object being created, or the
user clicking on.

Opened by [CnBuildiqEditButton](./cn-buildiq-edit-button.md)'s "Edit
walkthrough…" item, and mountable on its own surface by any consumer.

## Import

```js
import { CnEditWalkthroughModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose `walkthrough` block is edited in place. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |

## Writing the steps

A tour is the first prose a new user reads, so it takes the voice rules in full:
no em-dashes, a sentence under 16 words, a `task` that starts with a verb, and
no praise for the user. A step's `body` should say *why* the step matters; its
`task` says what to do. Repeating the task in the body wastes the only two lines
the user reads.

**The last step closes on a call to action.** A tour that simply stops leaves
the user with nowhere to go, so the final step points somewhere real, usually
the app's documentation.
