# ai-chat-companion Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [ai-companion-library-labels](../../)

## Purpose

The companion speaks the user's language wherever it is mounted.

## ADDED Requirements

### Requirement: The companion reads in the user's language on any page

CnAiCompanion SHALL provide `cnTranslate` to its descendants. A label the host's `cnTranslate` translates SHALL keep the
host's text; any other label SHALL be read from the library's catalogue, registered once for the page when no other
library surface registered it.

#### Scenario: Mounted by Hermiq on another app's settings page

- **GIVEN** a Dutch user on a page with no CnAppRoot
- **WHEN** the companion is mounted
- **THEN** its button is labelled "AI-chat openen"
