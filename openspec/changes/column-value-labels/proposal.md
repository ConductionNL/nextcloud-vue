# Proposal: column-value-labels

## Why

dossiq's DqTenant draws a tenant's mandates as a table: one row per role, with these columns:
- "Besluiten tot": an amount, or "Onbeperkt" when there is no ceiling;
- "Bezwaar beslissen": Ja or Nee, depending on whether the role's decision types include objections;
- "Handhaving": Nee, Waarschuwing or Ja.

The object table can already show a nested field and format an amount. It cannot:
- name an empty value;
- turn a stored code into a word;
- ask whether a list holds a value.

So the table needed a custom cell per app, which the manifest rule (pages are configuration over abstract widgets) does not allow.

## What changes

A table column (`CnDataTable`, and so `CnWidgetObjectTable` and every manifest table) may declare:
- `contains`: the cell is true when the row's value is a list holding this value, false otherwise;
- `valueLabels`: a map from a value (after `contains`) to the word shown, translated through the app's `cnTranslate`;
- `emptyLabel`: the word shown when the value is empty (null, undefined or ''), translated the same way.

Sorting, filtering and the column key are unchanged. Only the shown value changes, so a column can still sort on the stored value.
