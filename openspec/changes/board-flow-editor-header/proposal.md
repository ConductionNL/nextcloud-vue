# board-flow-editor-header

## Why

The board-look flow editor (board dossiq/DqFlow) padded its page 20px 24px, so its title stood 4px left of every other
board page's; its header buttons ("Controleren", "Uitvoering", "Opslaan") were 34px Nextcloud buttons in the primary
tint instead of the board's 40px header buttons; and the palette steps ("Status zetten") drew at 700, because the
nldesign theme sets every button's weight with `!important`, where the board draws a plain 400 label.

## What changes

- CnFlowBoard pads its page with `--cn-board-content-padding`.
- `.cn-flow-board__actions` joins the board header button rules.
- A palette step hands the theme's button weight token 400 and draws at 400.
