# A table in a card shows its first column as plain text

## Why

A list page's title column is a 15px, weight-600, underlined link (DqZaken).
The tables inside a card or a settings section (CnWidgetObjectTable) show
their first column as plain text: DqInstellingen, DqTermijnen, DqDoorlooptijd
and DqProcesanalyse. Live drew those as links too. COMPDIFF r24 recorded it as
`cell.fontWeight 400>600`, and a probe on :8080 found the 600-weight
underlined cells in DqDoorlooptijd's widget tables.

## What changes

The board's title-column rule now leaves `.cn-widget-object-table` alone.
