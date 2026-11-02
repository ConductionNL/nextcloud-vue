# ai-companion Delta

## ADDED Requirements

### Requirement: An embedded chat may open the user's session about the page's record

The `ai-chat` widget SHALL accept `content.openSubjectSession`. When it is true and the page context names a record (`objectUuid`), the widget SHALL ask the chat backend for the user's most recent session about that record and open it, with its messages and its pending approvals. When there is no such session, the request fails, or the returned session names another subject, the widget SHALL start an empty thread, as without the flag.

#### Scenario: A case page opens the handler's conversation about the case
- **GIVEN** a case page embeds the `ai-chat` widget with `openSubjectSession: true`
- **AND** the user had a session about this case with one question, one answer and one pending proposal
- **WHEN** the page opens
- **THEN** the widget SHALL show the question and the answer
- **AND** SHALL show the proposal as an approval card the user can carry out or decline

#### Scenario: No session about the record
- **GIVEN** the widget opts in and the user has no session about the record
- **WHEN** the page opens
- **THEN** the widget SHALL show an empty thread

#### Scenario: A backend that cannot filter by subject
- **GIVEN** the backend answers with a session whose subject is another record, or with none
- **WHEN** the page opens
- **THEN** the widget SHALL show an empty thread and SHALL NOT open that session

#### Scenario: A widget that does not opt in
- **GIVEN** an `ai-chat` widget without `openSubjectSession`
- **WHEN** the page opens
- **THEN** the widget SHALL make no session request and SHALL show an empty thread

### Requirement: A loaded conversation keeps its pending approvals

`loadConversation()` SHALL set the chat's pending approvals from the `pendingApprovals` the messages response carries, in the shape the stream's `final` event uses, so a reloaded conversation shows the same approval cards as a live turn.

#### Scenario: A conversation with a pending approval is reopened
- **GIVEN** a stored conversation whose agent waits on one approval
- **WHEN** the conversation is loaded
- **THEN** the approval SHALL be shown as an approval card with its title and its decide actions
