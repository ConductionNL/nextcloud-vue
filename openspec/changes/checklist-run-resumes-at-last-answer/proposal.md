# Proposal: checklist-run-resumes-at-last-answer

## Why

Board DqInspectie draws the inspector on the page they were working on: question 7 answered "Nee" with its note and photo, question 8 answered "Ja". With `startAt: "firstOpen"` the run opens at the first unanswered question, so once question 8 has its answer the frame moves on to questions 9 and 10. The board also draws no photo control under question 8: its photo is needed only for "Nee", yet the widget gave every such question a control whatever its answer. And the note label is drawn at 14px semibold, where the widget let it inherit the question's 15px bold.

## What changes

- `content.startAt: "lastAnswered"` opens the run at the page of its last answered question, or the first page when none is answered. It applies once per record, as `firstOpen` does.
- A question whose photo rule is `{ whenAnswer }` and whose answer is another value shows no photo control, unless it already holds a photo. Unanswered, it keeps its control, so a photo can still be taken first.
- The note label is 14px semibold.
- No manifest schema change.
