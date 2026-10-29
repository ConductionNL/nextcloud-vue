# Proposal: connections-panel-board-look

## Why

pl4 on board PqIntegrations: CnConnectionsPanel drew its cards 16px in and 8px round with 15px titles beside a 36px icon,
no rule above the card foot and none between the "Needs attention" rows. A working connection read "Geconfigureerd"
where the board reads "Ingesteld", and the action on a connection that is not set up read "Ingesteld" too, because
the button used the msgid "Set up", which the catalogue translates as a state. The filter field had no search icon.

## What changes

- Cards and side cards: 18px padding, 12px radius, 17px titles, a 40px icon; the card foot and each attention row sit
  under a rule.
- A working connection reads "Set up" (nl "Ingesteld"), the word CnRegisterMapping already uses for that state.
- The action on a connection that is not set up reads "Configure" (nl "Instellen"), a new msgid.
- The filter field shows a search icon.
