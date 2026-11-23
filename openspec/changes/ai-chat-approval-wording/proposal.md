# Proposal: ai-chat-approval-wording

## Why

Board DqZaakAssistent draws the assistant's proposal card as "Voorstel: taak aanmaken" with the buttons
"Uitvoeren" and "Niet doen". The approval card shows the tool's name with Allow / Decline, and an app has no way
to word it.

## What changes

- The `ai-chat` widget reads `approvalTitlePrefix`, `allowLabel` and `denyLabel` from its content, translates them,
  and passes them to CnAiCompanion and CnAiChatPanel as `approvalWording` `{ titlePrefix, allow, deny }`.
- The card title is the prefix, a space and the approval's title; the buttons take `allow` and `deny`.

## Not in this change

- No CSS and no library strings. Without the keys the card keeps the tool's name with Allow / Decline.
