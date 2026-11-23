# ai-companion Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [ai-chat-widget](../../)

## ADDED Requirements

### Requirement: The AI chat can be placed in the page

A manifest SHALL be able to place the AI Chat Companion as a widget (`type: "ai-chat"`). The placed chat SHALL be the
same companion as the floating window, always open, without the launcher and without a close button, and it SHALL NOT
take the page's floating-companion slot. It SHALL render nothing when the chat backend does not answer.

#### Scenario: DqZaakAssistent

- **GIVEN** a case page whose tab holds an `ai-chat` widget
- **WHEN** the handler opens that tab
- **THEN** the assistant's window is in the tab, open, with its agent, sessions and input
- **AND** the launcher hex still opens the floating window
