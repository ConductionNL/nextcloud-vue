# A message can show its subject, note and attachment count

## Why

DqZaakContact draws an e-mail with "Onderwerp: Aanvulling op Woo-verzoek 2026-0110" (15px/600) above its text, and grey lines under messages such as "Samengevat door Pieter Jansen, verzoek samen opgenomen" and "Binnengekomen op het Woo-postvak, 1 bijlage". The conversation widget had a note line but no subject and no attachment count.

## What changes

- CnConversationWidget `subjectField`: the subject on its own line above the text ("Subject: {subject}", nl "Onderwerp: {subject}"), weight 600.
- `attachmentCountField`: the count follows the note on the grey line ("%n attachment(s)", nl "bijlage/bijlagen"), joined with a comma; either part may be absent.
