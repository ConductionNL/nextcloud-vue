# Proposal: the smaller form features the status and property forms need

## Why

dossiq's status and property forms become manifest config. Next to the list editor and the reorder, they need a set of small things a form could not do from config:

- a colour per status option;
- the public label showing the name as its placeholder;
- property types grouped by category;
- a folded "More options" group;
- a "Choice list" switch that is not stored;
- choices entered one per line;
- a warning when a scheme and choices are both set;
- a rule that the choices are required unless a scheme is set;
- new statuses that start on the page's case type;
- the server's refusal shown in the dialog.

## What changes

- **Conditions** (`visibleWhen` and the new keys) take `empty`, `notEmpty`, and `all` / `any` compositions.
- **Field override keys:**
  - `requiredWhen`, `warnWhen` and `clearWhenHidden`;
  - `stored: false`, with `initialWhen`; it may be a key the schema does not have;
  - `placeholderFrom`, `optionSwatches`, `optionIcons` and `sectionCollapsed`.
- **`lines` widget:** a list of strings, one per line.
- **`optionsFrom` gains `groupField`.**
- **`CnObjectListWidget`:**
  - `createDefaults` resolves tokens such as `@objectId`;
  - a refused create shows the server's message.
- **Manifest schema 2.134.0** documents the keys.

## Depends on

This builds on `list-reorder-order-field` and the branches it holds, all merged into this one.
