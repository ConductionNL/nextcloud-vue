# widget-lead-widgets Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-lead-widgets-in-card](../../)

## ADDED Requirements

### Requirement: A card can lead with other widgets

A widget host that draws a card SHALL render the widgets `content.leadWidgetIds` names (found in `availableWidgets`)
inside that card, after the title row and before the widget's own content, in the listed order, each bare (no card of
its own). A lead widget whose `visibleWhen` does not hold SHALL draw nothing. An id that names no widget SHALL draw
nothing.

#### Scenario: DqZaakDocumenten

- **GIVEN** the Files card with `leadWidgetIds: ["case-document-verdicts-card"]` on a case type that reviews its documents
- **THEN** "4 van 7 beoordeeld" and its bar stand inside the Files card, above the file list
