# Proposal: ai-chat-widget

## Why

DqZaakAssistent draws the case assistant inside the case page, beside the tab content. The library offers the AI Chat
Companion only as the launcher hex and its floating window, so an app cannot place the assistant in its own page:
dossiq's case page could reach the chat only through the hex.

## What changes

- `CnAiCompanion` takes `embedded`: no launcher, always open, and it does not take the page's single
  floating-companion slot, so the floating companion keeps working beside it.
- `CnAiChatPanel` takes `embedded`: the same window in the page's flow, a region instead of a dialog, with no
  position, no pointer, no close button, and Escape does not close it.
- A widget type `ai-chat` (`CnAiChatWidget`) mounts the companion embedded, so a manifest can place it as a tab or a
  card. `content.chatAppId` names the backend.

## Scope

Additive. The floating companion is unchanged.
