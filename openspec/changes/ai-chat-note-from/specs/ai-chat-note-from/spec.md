# Delta: ai-chat-note-from

## ADDED Requirements

### Requirement: The chat note can read its facts from an endpoint

The `ai-chat` widget MUST show `noteFrom.text` filled from the matching row only while every field in `noteFrom.requires` is filled, and MUST show `note` in every other case, a failed read included.

#### Scenario: Hermiq has no binding for the feature

- GIVEN `noteFrom` naming a row whose `provider` is empty
- WHEN the widget draws
- THEN the note is `note`
