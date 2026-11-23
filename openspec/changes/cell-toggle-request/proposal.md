# Proposal: cell-toggle-request

## Why

Board DqZaaktypeVelden draws the "In de lijst" column of a case type's fields table as a plain checkbox per field
("Welstandsgebied in de lijst tonen"), ticked when the case type shows that field in its case list. The live page
reads Ja/Nee: a switch cell exists, but it takes its state and its write as functions, which a manifest cannot declare.

## What changes

- CnCellRenderer `switch`: `widgetProps.type: "checkbox"` draws a checkbox; without `checked`, a formatter that answers
  true or false gives the state.
- CnObjectListWidget: a column's `toggle` (`url`, `method`, `bodyKey`, `ariaLabel`, `labelFormatter`, `updatesRecord`)
  makes the cell a switch that sends the new state to an app endpoint. With `updatesRecord` the answer becomes the page's
  record and the cell is read only while the record cannot be edited.
- No schema change: column keys of a widget's content are not schema-constrained.
