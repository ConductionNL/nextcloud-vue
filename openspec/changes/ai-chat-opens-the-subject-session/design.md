## Decisions

### D-1 Opt-in per widget

A page that embeds the chat as a tab about one record wants the record's conversation; a general assistant on a dashboard does not. The widget opts in with `content.openSubjectSession: true`, so no existing consumer changes behaviour.

### D-2 The latest session about the record, the user's own

`GET {chatApiBase}/sessions?subject=<objectUuid>&limit=1`, newest activity first, read as the user. The backend decides which sessions the user may read; the widget never lists other users' sessions. A shared session the user takes part in counts as theirs, as it does in the history dialog.

### D-3 A backend without the filter

A backend that ignores `subject` would answer with the user's latest session about anything. The widget accepts a session only when its `subject` matches the page's `objectUuid`; otherwise it starts an empty thread. So an older backend degrades to today's behaviour instead of opening the wrong conversation.

### D-4 Pending approvals come with the messages

The messages response may carry `pendingApprovals` in the shape the stream's `final` event already uses (`{ id, kind, title, app, reach, reason, agentId, resolveUrl }`). `loadConversation()` sets `state.pendingApprovals` from it, so the cards render through the existing approval card path and are decided through their `resolveUrl`. No new card type.

## Risks

- One extra request when the widget mounts on a record page, only where the widget opted in.
