# conversation-source Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [conversation-all-chip-host-word](../../)

## ADDED Requirements

### Requirement: The All chip reads the host's word

The conversation thread's first channel chip SHALL read the host app's translation of `All` when the host translates
it, and the library's own word otherwise.

#### Scenario: DqZaakContact

- **GIVEN** dossiq translates `All` as "Alles"
- **WHEN** the conversation draws its channel chips
- **THEN** the first chip reads "Alles"
