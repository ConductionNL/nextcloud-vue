# manifest-i18n: delta for translate-identical-label

## ADDED Requirements

### Requirement: A host translation equal to its key is not replaced by the library's

When the app's catalog holds a label, the label lookup MUST show the app's translation even when it reads the same as the label, and MUST NOT fall back to the library catalog.

#### Scenario: the same word in both languages

- GIVEN pipelinq's nl catalog translates "Open" as "Open" and the library's translates it as "Openen"
- WHEN a pipelinq page shows the label "Open" in Dutch
- THEN it reads "Open"

#### Scenario: a label the app does not translate

- GIVEN the app's catalog does not hold "Open AI chat"
- WHEN a library component asks for it in Dutch
- THEN it reads the library's "AI-chat openen"
