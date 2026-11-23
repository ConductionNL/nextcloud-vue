# Proposal: board-form-select-no-margin

## Why

In the board look, a select in a form dialog (DqNieuweZaak "Zaaktype", "Intakekanaal") stood 6px lower than the text
field beside it ("Titel") and its help line 4px further down than a text field's: the form's label stands outside the
select, but NcSelect still kept its own 6px top and 4px bottom margin. Measured on :8080: label to control 35px for a
select, 29px for a text field; control to help line 10px for a select, 6px for a text field (the board draws 6px).

## What changes

In a board dialog, a select inside CnFormDialog's select wrapper without an inner label takes no block margin. Checked
on :8080 with the rule injected: Zaaktype's control at 266 as Titel's, its help line 6px under the control.
