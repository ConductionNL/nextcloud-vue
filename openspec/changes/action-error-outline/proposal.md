# Proposal: action-error-outline

## Why

Board PqKassabon draws "Terugboeken" (reverse a payment) as a red action that does not shout: a white button with a red
border, red text and its icon. `variant: "error"` paints the button filled red, which the boards keep for the confirming
button of a destructive dialog.

## What changes

- An action entry with `variant: "error-outline"` is drawn as a secondary button with a red border and red text.

Every other variant renders as before. No schema change.
