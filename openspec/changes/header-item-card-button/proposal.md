# Proposal: header-item-card-button

## Why

COMPDIFF pl4 measured PqKlant and PqOrganisatie Contactkanalen and Relaties with no button in the card's title row
(`header.actions 1>0`): pipelinq draws "Kanaal toevoegen" and "Relatie toevoegen" under the list. The boards draw the
add in the title row as the outlined card button (PqOrganisatie as amended, and DqTaak "Notitie toevoegen"). A widget
reports its title row through the `header` event, but a reported action could only be the tinted catalog link or a
primary button, and always ran one thing, where adding a channel offers a choice (e-mail, phone, social profile).

## What changes

- A reported header action with `variant: "secondary"` is drawn as an outlined NcButton (class
  `cn-detail-widget-header-items__card-button`), with an optional `ariaLabel`.
- With `items: [{ label, run }]` it is an outlined NcActions menu named by the action's label, one entry per item; the
  host keeps such an action although it has no `run` of its own.
- In the board look a side card shows its actions when they hold such a button, as it does for the catalog action.

## Reach

Opt in per reported action. Existing actions (no variant, `primary`) are unchanged.
