# A message's text can fall back across fields

## Why

DqZaakContact's table shows each contact's short summary while the conversation shows the full message. dossiq gives the contact moment a separate full `message` (coordinator, 27 Oct), which not every contact has; the conversation must then show the summary.

## What changes

- CnConversationWidget `bodyField` may be a list; the first field that holds text is the message's text. A single field works as before.
