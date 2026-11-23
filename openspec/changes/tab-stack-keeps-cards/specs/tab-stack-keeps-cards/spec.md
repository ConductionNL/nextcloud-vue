# tab-stack-keeps-cards Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tab-stack-keeps-cards](../../)

## Purpose

A tab declared as a stack of cards stays cards when conditions show only one of them.

## ADDED Requirements

### Requirement: A stack stays cards when one of its widgets shows

A tab whose `widgetIds` name two or more existing widgets SHALL draw the widgets its conditions show as titled cards,
also when only one of them shows. A tab whose `widgetIds` name only one existing widget SHALL stay a plain panel.

#### Scenario: DqSociaalDomein Overview

- **GIVEN** a case Overview stack of the generic cards and "The report", where the case type hides the generic cards
- **THEN** "The report" ("De melding") is drawn as a titled card
