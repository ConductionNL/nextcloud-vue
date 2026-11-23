## ADDED Requirements

### Requirement: A message can show its subject, note and attachment count

When the conversation widget names `subjectField`, a message with a subject SHALL show "Subject: <subject>" above its text. When it names `noteField` and/or `attachmentCountField`, the grey line under the message SHALL read the note, then the attachment count when above 0, joined with ", ".

#### Scenario: an e-mail with one attachment
- GIVEN an inbound e-mail with subject "Aanvulling op Woo-verzoek 2026-0110", note "Binnengekomen op het Woo-postvak" and 1 attachment
- THEN it shows "Onderwerp: Aanvulling op Woo-verzoek 2026-0110" above its text and "Binnengekomen op het Woo-postvak, 1 bijlage" under it
