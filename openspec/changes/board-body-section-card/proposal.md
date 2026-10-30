# Proposal: board-body-section-card

## Why

PL5-B measured PqKlant's and PqOrganisatie's "Contactmoment registreren" card titled at 14px, weight 600 over a
hairline, 17px in from the card edge, with Annuleren and Opslaan at 34px. The boards draw every card the same way:
the title 17px at 700 with no rule, 23px in, and the card's buttons at the 40px control height. The card is a body
section with `card: true` (CnBodySections), which styles its card and title itself.

## What changes

In the board look a body section card takes the board card's padding and radius, its title is
`--cn-board-heading-size` at 700 with no rule and 14px above the body, and its labelled buttons are the
`--cn-board-control-height`. The Nextcloud look is unchanged.
