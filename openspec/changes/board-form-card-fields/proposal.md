# Proposal: board-form-card-fields

## Why

pl6 on :8080, PqKlant and PqOrganisatie "Contactmoment registreren": the boards draw the client page's log form as a
board settings card draws its fields (label 14/600 6px above a 40px field, text areas at 1.5, 40px buttons 16px in).
Live floated each label inside a 34px Nextcloud field and drew 34px buttons. Those rules were scoped to
`.settings-section`, so a form card elsewhere could not use them.

## What changes

- An opt-in class `cn-board-form` on a container takes the same field, label and button rules as a board settings
  card. Each rule gains the `cn-board-form` selector beside the settings one, so specificity and the settings card do
  not change.

## Reach

look-board.css only. Nothing uses the class until an app adds it (pipelinq ContactmomentQuickLog).
