# Proposal: ai-chat-opens-the-subject-session

## Why

DqZaakAssistent draws the case assistant with the conversation the handler already had about this case: the question, the answer, and a pending proposal ("Voorstel: taak aanmaken" with Uitvoeren and Niet doen). The `ai-chat` widget always mounts an empty thread. It opens a stored conversation only from the history dialog, and `loadConversation()` keeps role and content only, so a proposal the agent is still waiting on is never shown after a reload. A page about a record therefore cannot show what was already said about that record, and a demo case renders its Assistant card 140 px shorter than the board.

## What changes

- The `ai-chat` widget takes `content.openSubjectSession` (default false). When it is true and the page context names a record (`objectUuid`), the widget asks the chat backend for the user's latest session about that record and opens it, instead of starting an empty thread.
- `useAiChatStream().loadConversation()` keeps the `pendingApprovals` the backend returns with a session's messages, so they show as the same approval cards a live turn shows, and can be decided there.
- No session about the record, or a backend that does not support the subject filter, leaves the widget as it is today: an empty thread.

## Depends on

The chat backend lists sessions by subject and returns a session's pending approvals with its messages. For hermiq this is its change `session-about-a-subject`. Until that lands the widget falls back to an empty thread, so this change can ship first.

## Scope

Additive and opt-in. The floating companion and every widget without `openSubjectSession` are unchanged.
