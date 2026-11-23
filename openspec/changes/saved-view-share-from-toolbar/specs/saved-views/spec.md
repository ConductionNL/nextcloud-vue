# saved-views Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-share-from-toolbar](../../)

## Purpose

A reader who has one of their own saved views open can share it from the toolbar, through the same dialog as the side panel.

## ADDED Requirements

### Requirement: An index page can share the open view from the toolbar

With `config.savedViewShare: true` an index page SHALL draw "Share: {name}" beside Save view while a stored saved view the reader owns is open, and the button SHALL open the saved-view share dialog for that view. A default view, a view shared with the reader and a page without the key SHALL draw no share button.

#### Scenario: PqTicketsSelectie

- **GIVEN** pipelinq's tickets list with `savedViewShare: true` and the reader's own view "Klachten deze week" open
- **THEN** the toolbar shows "Delen: Klachten deze week" beside "Weergave opslaan"
- **WHEN** the reader clicks it
- **THEN** the dialog "Weergave delen: Klachten deze week" opens, and saving it stores the audience on the view

#### Scenario: A view shared with the reader

- **GIVEN** a view a colleague shared with the reader is open
- **THEN** the toolbar shows no share button
