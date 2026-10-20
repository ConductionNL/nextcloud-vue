# board-settings-card-controls

## Why

On an admin settings page in the board look a card's text fields were 34px (the input 30px), and its save buttons and
the version card's buttons 34px at 15px. Boards dossiq/DqInstellingenAlgemeen and DqBeheerinstellingen draw them 40px
with 14px labels, as the board forms and dialogs already do through `--cn-field-height`. The compact version card's
title is 18px on both boards; it drew 17px like the other cards.

## What changes

In the board look:

- A settings card's text fields are `--cn-field-height` (40px) tall; the wrapper holds the input and its focus ring.
- A settings card's save button and the version card's buttons are 40px with 14px labels.
- The title of a card holding the compact version card is 18px.

The Nextcloud look is unchanged; buttons in a card's header and inline buttons keep 34px.
