# useWriteFeedback

One voice for "your write landed", "it failed" and "are you sure", over `@nextcloud/dialogs` toasts and a small confirm dialog. `CnFormDialog`, `CnLifecycleActions` and `CnObjectListWidget` use it, so feedback is the default and not something each app has to remember.

```js
import { useWriteFeedback } from '@conduction/nextcloud-vue'

const feedback = useWriteFeedback()
feedback.success('Saved Permit 2026-00012')
feedback.success('Deleted Permit 2026-00012', { undo: () => restore() }) // Undo button for 10 s, runs once
feedback.error('Identifier already exists')
if (await feedback.confirm('Close this permit?', { confirmLabel: 'Close', variant: 'error' })) { /* … */ }
```

| Function | Description |
|----------|-------------|
| `success(message, { undo?, timeout? })` | A success toast. With `undo`, the toast carries an Undo button for ten seconds (`timeout`, default 10000 ms) that runs the callback once. |
| `error(message)` | An error toast. |
| `confirm(message, { title?, confirmLabel?, variant? })` | Resolves `true` on Confirm and `false` on Cancel or dismiss. |

Undo is never guessed: a save has no Undo (the version history is the way back), and a transition only has one when the graph declares the way back.
