# Proposal: condition-list-editor

## Why

An app that lets an administrator write a rule ("Als Bouwkosten groter is dan € 100.000 …") needs the conditions as
rows over the object's own fields, and needs the same condition back as a sentence in the list of rules. Dossiq's case
type rules are the first user. `CnFilterRowsEditor` writes OpenRegister filters with symbol operators and free text; it
knows nothing of a field's type, so it cannot offer "is filled in" for a document or ja/nee for a yes/no field.

## What changes

- `CnConditionListEditor`: rows of field, operator and value over the `fields` an app passes
  (`{ id, label, type, options?, format? }`), with add and remove, v-model on `{ field, operator, value }[]`.
  - The operators follow the field's type: number and date compare, text and choice say is or is not, yes/no says
    is yes or no, and every type except yes/no can be "is filled in", which needs no value.
  - The value is a choice for a choice or yes/no field, a number field for a number, a date field for a date,
    otherwise text.
- `conditionOperators.js`: `operatorsForType(type)` and `conditionSentence(condition, fields)`, the condition as the
  words of a rule ("Bouwkosten groter is dan € 100.000", "Welstandsgebied ja is"), translated, the value formatted by
  the field (a currency in euros, a yes/no as ja/nee, a choice by its label).

All conditions hold together; the editor has no AND/OR groups. An app that needs groups uses a tree editor.
