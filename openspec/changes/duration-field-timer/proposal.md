# Proposal: duration-field-timer

## Why

Boards PqTicketContactLoggen, PqContactmoment, PqMobiel and PqWerkplekKlant draw a length that runs while it happens: Start, Stop and Reset,
a clock that also takes typing, and "Gesprekstijd 03:00 van 05:00" against a norm. pipelinq has this as a local `CallTimer`. `CnDurationField`
is already the duration widget of `CnFormDialog`, so the clock belongs there.

## What changes

- `CnDurationField` gets `timer`, `autoStart`, `norm`, `normWarningPercent`, `normLabel`, `timerLabel` and `hint`, and the events `started`, `stopped` and `reset`.
- `CnFormDialog` passes `timer`, `autoStart`, `norm` and `normLabel` from a field override.
- `utils/isoDuration` gets `secondsToDuration`, `formatClock` and `parseClock`.
- Without `timer` the field behaves as before.

Item 1 of the fleet component gap list (decisions 281, 320).
