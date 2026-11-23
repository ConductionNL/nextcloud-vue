# A schema rules widget

## Why

OpenRegister's rule engine evaluates every save; an app shows a schema's rules
and lets an administrator try one against a stored object. dossiq had this for
its case schema; every app on the engine needs it.

## What changes

- New `CnSchemaRulesWidget` (manifest widget type `schema-rules`): the inventory
  in evaluation order, kinds from the vocabulary, a dry run with its trace, and a
  refusal said in a sentence.
