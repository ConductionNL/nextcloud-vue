# CnStageMoveDialog

Asks for what a stage move needs before it is sent. Opened by [`CnStagesWidget`](./cn-stages-widget.md) when the availability answer says the move declares a comment or a result, or when the widget is set to confirm every move.

The dialog exists so a guarded move is never sent half-configured. A case that closes has to close with a result, and an app that records why a case moved needs the comment at the moment of the move, not in a follow-up edit.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `stageLabel` | `string` | `''` | The target stage, named in the dialog title. |
| `commentMode` | `string` | `'none'` | `'none'`, `'optional'` or `'required'`. Anything but `'none'` renders the comment field. |
| `resultOptions` | `array` | `[]` | The results on offer, as `{ id, label }`. An empty list renders no result picker. |
| `resultRequired` | `boolean` | `false` | Whether a result has to be picked before the move can be confirmed. |
| `busy` | `boolean` | `false` | The move is running. The dialog cannot be closed or confirmed while this is true. |
| `error` | `string` | `''` | The refusal to show inside the dialog, announced with `role="alert"`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `{ comment?, result? }` | The person confirmed. An empty comment is left out rather than sent as an empty string. |
| `close` | — | The person cancelled, or closed the dialog. No move is made. |

## Notes

- The confirm button stays disabled until a required comment is typed and a required result is picked.
- A refusal keeps the dialog open with the message inside it, so the typed comment is not lost to a guard the person can still satisfy.
- A stage that closes the record says so above the result picker, because picking a result is otherwise an unexplained extra step.

Next: see when the dialog opens in [`CnStagesWidget`](./cn-stages-widget.md).
