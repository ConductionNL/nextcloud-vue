# Proposal: workspace-filter-input

## Why

Board DqTermijnen draws its quarterly report and its annual audit with the form inside the card: a "Kwartaal (JJJJ-Qn)"
field with "Rapport laden", a "Jaar" field with "Audit laden". The library could only offer the quarter and year as
page filters in the header, so the cards lost their form (Ruben, 21 Oct: Termijnen follows the board).

## What changes

A `workspace-filter` widget can be an input with a load button (`style: "input"`). The value is written to the workspace
only when it is loaded and only when valid: `inputType: "quarter"` reads `YYYY-Qn` and `"year"` reads `YYYY`, both
seeded with the current one; free text takes a `pattern`. A wrong value is marked invalid and explained under the field.
