# Proposal: checklist-run-start-at-first-open

## Why

Board DqInspectie draws an inspector halfway through a run: the middle phone frame opens at "Vraag 7 van 24", the first question not answered yet. The widget always opened at question 1, so a run started earlier made the inspector page past every answered question to get back to work.

## What changes

- `content.startAt: "firstOpen"` opens the run at the page of its first unanswered question, or the last page when every question is answered. It applies once per record: saving a page and reading the record again keeps the page the inspector is on.
- Without `startAt` nothing changes: the run opens at the first page.
- No manifest schema change.
