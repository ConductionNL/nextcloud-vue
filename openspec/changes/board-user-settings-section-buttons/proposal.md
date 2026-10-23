# Proposal: board-user-settings-section-buttons

## Why

DqPersoonlijkeInstellingen draws the user settings dialog's section buttons text-only at the 40px control height,
16px in: "Waarneming registreren", "Inloggegevens toevoegen", "Opnieuw beginnen". Live they are NcButton's 34px with an
icon. COMPDIFF r23: `h 40>34` and `icon` on all three. With the rule the widths match the board (187.2, 196, 153.3px).

## What changes

In the board look a labelled NcButton inside a user settings section takes the control height and 16px padding, and
draws without its icon. Icon-only buttons and plain buttons (the ordered list's move buttons) are untouched.

## Scope

Board-only, `dialog.css`. No schema change.
