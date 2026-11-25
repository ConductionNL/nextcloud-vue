# Proposal: properties-table-by-keyboard

## Why

OpenCatalogi's officer keyboard walk (officer-flow-accessibility, REQ-OFA-002) cannot fill a publication's title. CnPropertiesTab opens a row for editing only on a mouse click on the `<tr>`. Tab inside OpenCatalogi's Create Publication dialog reaches the switches and the Close buttons, never a property, so a keyboard user cannot create anything through it (WCAG 2.1.1).

## What changes

- CnDetailGridCell mounts a held-back widget on the first Tab key press. Its placeholder has nothing to focus and Tab does not scroll to it, so a widget below the fold (OpenCatalogi's publication status, with Withdraw) was never reached by keyboard.

- An editable row's name is a `<button>` that looks like the label it replaces. Enter or Space on it opens the row and moves focus into its input, as a click does. It carries `aria-expanded` while the row is open.
- A locked row, or a type the table does not edit inline, keeps the plain label.
- A click anywhere else in the row behaves as before.
