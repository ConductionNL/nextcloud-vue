# ai-companion Delta

## ADDED Requirements

### Requirement: The sessions menu leads with the sessions about the page

When the companion's context names a file (`fileId`) or a record (`objectUuid`), the chat panel SHALL ask the chat backend for the user's sessions linked to it and, when there is at least one, SHALL list those in the sessions menu under a heading that names the entity by the label the backend returns. Without such a context, without such sessions, or when the request fails, the menu SHALL list the user's recent conversations as before. The menu SHALL always offer the full, unscoped list.

#### Scenario: A document with earlier sessions about it
- **GIVEN** the user had two sessions about the file "subsidiebesluit.docx"
- **WHEN** they open the sessions menu on that file
- **THEN** the menu SHALL be headed "Sessions about subsidiebesluit.docx" and list those two sessions
- **AND** SHALL offer "View all conversations"

#### Scenario: A page without a file or record
- **GIVEN** the companion has no `fileId` or `objectUuid` in its context
- **WHEN** the user opens the sessions menu
- **THEN** the menu SHALL list the recent conversations under "Recent conversations"

### Requirement: The user sees and removes what a session is linked to

While a session is open, the chat panel SHALL offer a session settings entry in its titlebar that lists the links the backend returned for that session, and SHALL let the user remove each one. After a removal the session SHALL no longer appear in the scoped list of the removed entity.

#### Scenario: Removing a link
- **GIVEN** an open session linked to the file "subsidiebesluit.docx"
- **WHEN** the user removes that link in the session settings
- **THEN** the panel SHALL send the removal to the backend
- **AND** the session SHALL leave the list of sessions about that file
