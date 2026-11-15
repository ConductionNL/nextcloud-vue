# A table can stack its rows on a phone

## Why
larpinq's check-in roster on a phone needs stacked rows and 44px buttons (`admin-phone-friendly-pages` task 1.2). The
rows are CnDataTable's own, so an app cannot restyle them without reaching into the library's markup.

## What changes
CnDataTable takes `stackOnPhone`. Every data cell carries its column name, and under 600px the rows become stacked
blocks with the column name before each value, the header row visually hidden and buttons 44px tall. Off by default.
