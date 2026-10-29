# A linked mail shows the details the boards draw

## Why

DqZaakEmail draws each linked mail with one line under its subject: "Van Sanne de Vries · 5 okt 09:15 · 1 bijlage · automatisch gekoppeld via het Woo-postvak". An outgoing mail reads "Aan Lars de Koning · 4 okt 11:02 · door Pieter Jansen gekoppeld", on a light blue initials tile. A pill after the text says "Als pdf gearchiveerd", or "Gekoppeld" for a mail without an archive copy. CnEmailTab showed only the sender's address.

## What changes

- CnEmailTab reads OpenRegister's EmailLink `details` (openregister #5008): direction, recipientName, attachmentCount, linkedVia, archivedAs and mailboxName.
- A mail with details gets the meta line in place of the sender and the date on the right. Parts that are missing are left out.
- The date reads as the boards write it: the time is added for mail from the last week.
- An outgoing mail gets the outgoing initials tile. Every mail with details gets the archive pill or "Linked".
- A mail without details keeps the sender line, the date on the right and no pill.
- 8 new strings in en and nl.
