# A labelled select in a board page card carries its label above

## Why

The boards draw every labelled select with its label above the control, 14px/600, 6px over a 40px field (19 of 19 labelled selects on the Dq boards). Board dialogs already do this (dialog.css: raised label and 21px of room). In a page card NcSelect kept its label inside a 44px field at 15px/700 (thematiq forces the label weight token): DqZaakEmail "E-mailsjabloon", r30 content 40.4 vs 49 under the title.

## What changes

- Board look, a select with a visible label inside a CnDetailWidgetHost (not the quick filter bar dropdown): 21px of room above, no bottom margin, the label raised above the control at 14px/600 on the normal line (the theme's label weight token set to 600 on the select), the field 40px plus its focus inset.
- The mail card's template buttons are 40px, their bottom on the field's edge.
- Probed on :8080 with the rules injected: label 32.4 and control 55.4 under the title (board 32 and 55), buttons 55.4 and 40 high (board 55, 40). Selects without a visible label (the Historie filters) are untouched.
