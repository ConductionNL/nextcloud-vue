# Proposal: checklist-run-widget

## Why

Board DqInspectie's middle phone frame shows a checklist run one question at a time: "Vraag 7 van 24 · Brandveiligheid
versie 3", the question with Ja / Nee / Niet van toepassing, a photo for the question, and Vorige / Volgende. The library
had the offline field-inspection card (every question of a checklist at once, queued offline) but no widget that walks
an online checklist a question at a time from manifest configuration.

## What changes

- New widget type `checklist-run` (CnChecklistRunWidget), for detail pages and dashboards, usable inside `device-frames`.
- Questions are records of a register, listed with a token-resolved filter and ordered by a field.
- Answers are saved one record per question through the OpenRegister object API under the reader's own rights, or
  through an app-supplied `saveAction`. A `finishAction` runs after the last page.
- Photos go up through the answer object's own file upload (`uploadHeldFiles`); no new storage.
- Native fieldsets and radio buttons, focus and a live announcement on each page.
- No manifest schema change: widget content is not typed per widget type.
