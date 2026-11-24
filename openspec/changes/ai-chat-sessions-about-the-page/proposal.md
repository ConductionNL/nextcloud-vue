# Proposal: ai-chat-sessions-about-the-page

## Why

A chat backend can record what a session is about: hermiq writes a link (a file by id, a record by uuid, with a display label) whenever a turn is sent from a page that names one, and lists the sessions about one entity with `GET /conversations?linkedType=&linkedId=` (hermiq change `session-entity-links`). The companion's sessions menu ignores this and always shows the five most recent conversations, and nothing in the window shows what a session was linked to or lets the user remove that link. A link the user cannot see or remove is a tracker.

## What changes

- The sessions menu of `CnAiChatPanel` asks the backend for the sessions about the page's file or record (from the panel's `context`: `fileId`, else `objectUuid`) and, when there are any, lists those first, headed "Sessions about {label}" with the label the backend returns. "View all conversations" stays as the way to the unscoped list.
- No such context, no sessions about it, or a failing request leaves the menu as it is today: "Recent conversations".
- A "Session settings" entry in the titlebar, shown while a session is open, lists the session's links and removes one with `DELETE {chatApiBase}/sessions/{uuid}/links?type=&id=`. A removed link takes the session out of the scoped list.
- `normalizeConversation()` keeps a conversation's `links`; `aiChatConfig.js` gains `sessionLinksUrl(appId, uuid)`.

## Scope

Additive. A backend that ignores `linkedType`/`linkedId` and returns no `links` shows the scoped heading at worst over its own recent list, and no link entries.
