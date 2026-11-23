# Proposal: board-settings-section-subtitle

## Why

COMPDIFF r22 measured the settings cards on DqVthInstellingen ("Legesregels", "Activiteiten uit het Omgevingsloket")
and DqInstellingen ("Koppelingen") with their first content line at 23px and 15px in the main ink, where the boards
draw a 14px muted subtitle under the title and start the content at the table (35px). Two causes in the board look:

- the theme sets every paragraph's size, leading and ink with `!important` through its paragraph tokens, so the
  board look's 14px muted description rule never won: the description rendered 15px in the main ink on every
  themed settings page;
- on a card with actions, the description took the grid row under the title row, so it dropped under the 40px
  buttons, 16px below the title, instead of sitting under the title beside the buttons.

## What changes

In the board look only:

- the settings card description hands the theme 14px, line-height 1.5 and the muted ink through the paragraph tokens;
- on a card with actions and a description, the description sits in the title column on the second row and the
  actions centre on both rows; a narrow card still drops the actions under the text.

The Nextcloud look is unchanged.
