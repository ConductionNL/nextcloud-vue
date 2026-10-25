# A board choice option's name is bold

## Why

The dialog boards draw each option's name in `<strong>` (700):
DqDocumentGenereren, DqVolgendeStap. CnChoiceCards sets 600 (r26c:
DqDocumentGenereren option headers 600 vs 700).

## What changes

- Board look: `.cn-choice-cards__row-title` is 700. Nextcloud look unchanged.
