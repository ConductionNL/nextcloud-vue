---
kind: code
---

# Proposal: dq-abstract-record-widgets

## Summary

Ruben, 20 Oct 2026: pages are manifest config over abstract, configurable library widgets. Code is named by what it
does, never by a procedure or a case type.

The case page in dossiq carries sixteen app components that each draw one part of a record: the banner strips above the
tabs (archived, unread, what the status asks, attention), the location map, the parties, the linked contact moments, the
goal plan, the planned follow-ups, the programme, the work instruction, the notes tab, the redaction page and the
"first today" card. Every one of them is a pattern another app needs too. This change grows the library widgets those
patterns map onto, and adds the two that have no library home yet, so dossiq can declare the page and delete its
copies (audit `DQ-ABSTRACT`, lane L4-RECORD).

## Scope

- `banner`: the page's record as the subject of a local condition, `fallbackText` / `fallbackLead` / `fallbackReason`,
  an endpoint condition that names the record, `extend` on a source condition.
- `sections`: `dividers: false`.
- `tabs`: `badgeSource: "readState"` marks the opened tab's part of the record read.
- New `attention-flag` (CnAttentionFlagWidget) and `status-explainer` (CnStatusExplainerWidget).
- `map`: a filtered, token-resolved OpenRegister source, empty and error lines, a refresh event.
- `facts`: a `progress` entry, `when` on any entry, `source.path`, `emptyActions`, a retry, a link into another app.
- CnNotesTab: `mentionUrl` and note actions with an `endpoint`.
- CnRedactionEditor: a breadcrumb from config, and the `redaction` page type (manifest schema 2.137.0).

Followers are not in scope: Ruben decided they show only in the header popover.
