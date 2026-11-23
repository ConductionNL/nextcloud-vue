## ADDED Requirements

### Requirement: the AI companion falls back to the library's strings

Without an injected `cnTranslate`, the AI companion's parts MUST translate their strings through the library's catalogue, registering it if the page has not. An injected `cnTranslate` MUST still be used when present.

#### Scenario: hermiq's standalone companion on a Dutch settings page
- GIVEN the companion mounted without CnAppRoot, for a Dutch user
- THEN its button is named "AI-chat openen"
