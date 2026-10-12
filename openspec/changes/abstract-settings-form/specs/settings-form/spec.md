# settings-form Delta: abstract-settings-form

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-settings-form](../../)

## Purpose

Edit scalar fields of the current object from configuration, instead of an app component per settings card.

## ADDED Requirements

### Requirement: A settings form draws the configured fields of the current object

The `settings-form` widget SHALL draw one control per `content.fields` entry, valued from `objectData[key]`, in a grid
of `content.columns` (1 or 2, default 2) with a label and an optional hint under the control. Field types SHALL be
text, textarea, select, switch and number; an unknown type SHALL draw as text.

#### Scenario: A portal's details

- **GIVEN** fields title, tagline, slug (with a hint) and kind (a select)
- **WHEN** the widget renders
- **THEN** title and tagline share a row, the slug hint shows under its input, and the select holds the stored kind

### Requirement: A settings form saves only what changed

A save SHALL PATCH only the fields whose value differs from the last saved values, SHALL send numbers as numbers and an
emptied value as null, and SHALL move the last saved values forward on success. With nothing changed it SHALL send no
request. A refused PATCH SHALL show the server's message and keep what was typed.

#### Scenario: Back to the loaded value

- **GIVEN** the title was changed and saved
- **WHEN** the person edits it back to the value the page loaded with and saves
- **THEN** a PATCH with the title is sent

### Requirement: A settings form validates before any write

`required`, `min`, `max`, `pattern` SHALL be checked before any request; a failing field SHALL show its message and no
request SHALL be sent.

#### Scenario: A bad address

- **WHEN** the slug does not match its pattern
- **THEN** the patternMessage shows under the field and nothing is written
