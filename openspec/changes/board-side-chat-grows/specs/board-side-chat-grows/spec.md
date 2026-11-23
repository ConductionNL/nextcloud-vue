# Delta: board-side-chat-grows

## ADDED Requirements

### Requirement: The side chat grows with its thread

In the board look, an embedded chat in a detail page's side column MUST take the height of its thread and MUST NOT scroll inside the card.

#### Scenario: a thread longer than the panel used to be

- GIVEN a case page in the board look with the chat widget in the side column
- WHEN the thread is taller than 520px
- THEN the card grows and the thread has no scrollbar of its own
