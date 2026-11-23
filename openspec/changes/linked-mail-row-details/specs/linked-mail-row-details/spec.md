## ADDED Requirements

### Requirement: A linked mail with details reads as the boards draw it

CnEmailTab SHALL show a mail whose link carries details with one line under the subject. The line joins these parts with middle dots, leaving out any part that is unknown:

- "From {sender name}", or "To {recipient}" for an outgoing mail;
- the date, with the time for mail from the last 7 days;
- the attachment count when it is above 0;
- how the mail was linked: "linked automatically via {mailbox}", "from a saved mail file" or "linked by {person}".

The mail's date SHALL NOT also stand on the right. An outgoing mail SHALL use the outgoing initials tile. A pill SHALL follow the text: "Archived as PDF" (or "Archived as {format}") when the link names an archive copy, else "Linked". A mail without details SHALL keep the sender line, the date on the right and no pill.

#### Scenario: the Lindelaan mails
- GIVEN the three mails DqZaakEmail draws, with their details on the links
- THEN they read "From Sanne de Vries · 5 Oct 09:15 · 1 attachment · linked automatically via het Woo-postvak" with "Archived as PDF"
- AND "To Lars de Koning · 4 Oct 11:02 · linked by Pieter Jansen" on the outgoing tile with "Archived as PDF"
- AND "From Aannemersbedrijf Van Wijk · 12 Mar · 2 attachments · from a saved mail file" with "Linked"
