---
kind: code
---

# Proposal: detail-endpoint-answer-parts

## Summary

A detail page reads its record from an app endpoint (`entitySource: "endpoint"`, detail-endpoint-source), but only the
part at `recordPath`. An endpoint that answers a record together with its thread and terms
(`{ report, messages, terms }`) lost everything beside the record, so the thread could not be a `conversation` widget
and the page had to be an app component. Its reply endpoint also takes the text under its own name (`body`), while the
conversation posted `message`, and it answers without echoing the text, so a sent reply did not show.

## Scope

- `src/composables/indexSources.js`: `sourceConfig.attach` (`{ <record key>: <answer path> }`) puts other parts of the
  answer on the record.
- `src/components/CnConversationThread/CnConversationThread.vue`: `messageKey` names the field the reply text is posted
  under (default `message`).
- `src/components/CnConversationThread/CnConversationWidget.vue`: `content.messageKey`; an endpoint answer that does
  not echo the text makes the page read the record again (`cn:page:refresh`).
- Docs: `cn-detail-page.md` (a worked example), `cn-conversation-thread.md`, `cn-conversation-widget.md`.

## Consumer

portaliq intake-report-pages T08: the staff detail of a report filed without an account, over `GET /api/reports/{id}`,
with the thread, the reply with the "visible to the reporter" switch and the reveal request with a motivation
(an `open-form` header action with a POST `endpoint`, which already exists).
