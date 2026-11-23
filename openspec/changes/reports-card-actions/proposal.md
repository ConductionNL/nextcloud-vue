# A report card can carry actions of its own

## Why
hermiq lets a person subscribe to any report weekly or monthly and cancel again, from the card on the Reports page
(`reports-on-a-schedule` task 1.2). CnReportsPage cards could only open their report.

## What changes
`config.cardActions` on a reports page: actions drawn on every card in each layout, dispatched with the card as the
object (`@objectId` the card id). `config.cardState` reads a per-card state (rows keyed by `keyField`, or a map); an
action's local `visibleWhen` reads the card with that state as `state`, and the states are read again after an action.
No schema change: the reports page config is not closed.
