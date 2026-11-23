# Proposal: checklist-run-deadline

## Why

Board LqLlToetsMaken draws question pages with "Resterende tijd: 18:42" following the server's deadline, "Je antwoorden zijn opgeslagen", and Toets inleveren next to Vorige and
Volgende. `CnChecklistRunWidget` has the questions, choices, text answers and Previous and Next. learniq `TakeAssessmentView` carries the rest as local code.

## What changes

- `deadlineField`, `serverNowField`, `timeLeftText` and `timeWarningSeconds`: the time left, read from the record, and saving and finishing at zero.
- `savedText`: a line that says the answers are saved, only while that is true.
- `submitLabel`: a button that finishes from any page.
- `finished` gains `reason`. Without these keys the widget is unchanged.

Safe mode, a start screen, access codes and attempts stay in the app. Item 8 of the fleet component gap list (decisions 281, 320).
