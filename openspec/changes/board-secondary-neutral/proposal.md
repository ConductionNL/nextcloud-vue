# Proposal: board-secondary-neutral

## Why

The boards draw every secondary button neutral: the main background, a 1px control border and the main text. Outside
the page header, the settings card actions and the dialog footer, a board-look secondary NcButton still draws
Nextcloud's primary tint on a 2px bottom edge. COMPDIFF r19b: "Testen met een zaak" (DqFlow), "Documentatie"
(DqFunctionaliteiten), "Afronden" and "Teruggeven" (DqTaak), "Iets inplannen" (DqUwWachtrij), "Leeg concept"
(DqZaakEmail) and others, 25 buttons on 12 boards with the tinted ground or the tint's border.

## What changes

In the board look a secondary NcButton points the variables NcButton draws a secondary from
(`--color-primary-element-light`, `-hover`, `-text`) at the main background, the hover ground and the main text, and
carries a 1px border in `--cn-board-control-border`. Surface rules of the same weight that come later in the cascade
(the dialog footer's cancel) keep deciding for their surface. A page in the Nextcloud look inside a board app and
breadcrumb buttons are left alone.

## Scope

Board-only: the default look keeps Nextcloud's tinted secondary. WCAG: the control border is the 3:1 control edge.
