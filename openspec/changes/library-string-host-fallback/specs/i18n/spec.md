# i18n Delta: library-string-host-fallback

## ADDED Requirements

### Requirement: A library string the host does not translate reads in the library's translation

When the injected host translation returns the English string unchanged, a library component SHALL use the library's own translation for it.

#### Scenario: dossiq in Dutch
- THEN the AI button is named "AI-chat openen"
