# A board dialog's choice rows stand 10px apart

## Why

Every dialog board draws its options 10px apart (DqDocumentGenereren, DqVolgendeStap, DqInstellen fieldset/column gap 10). CnChoiceCards sets 8, so each further option sat 2px higher (r32 DqDocumentGenereren: Woo-besluit rows y -4.3 and -5.1, the fills -5.9).

## What changes

- Board dialogs: `.cn-choice-cards__rows` gap 10px.
