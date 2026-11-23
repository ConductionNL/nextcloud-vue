# board-link-buttons-keep-button-ink

## Why

Under the nldesign theme a board button that is a link ("Documentatie" in the admin header, "Activiteit koppelen" and
"Regel toevoegen" on a settings card) drew in the theme's link colour with an underline: the theme paints every `<a>`
that way with `!important`. A settings card's secondary actions ("Checklist toevoegen") drew in Nextcloud's primary
tint. The boards (dossiq/DqInstellingenAlgemeen, DqVthInstellingen, DqInstellingen, DqBeheerinstellingen) draw both
as neutral buttons in the main ink.

## What changes

- In the board look a button that is a link hands the theme's link and surface tokens the button's own ink, and draws
  no underline. A primary link button keeps the primary text colour.
- In the board look a settings card's secondary actions are neutral: main ink, 14px/600, main background, control border.
- The Nextcloud look is unchanged.
