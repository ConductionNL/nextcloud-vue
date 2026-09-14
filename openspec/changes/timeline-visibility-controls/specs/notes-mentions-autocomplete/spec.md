# notes-mentions-autocomplete Delta: timeline-visibility-controls

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [timeline-visibility-controls](../../)

## Purpose

Render the internal or public flag OpenRegister's
`timeline-entry-visibility` puts on every note and feed row, and let a
user who may set it do so. Task 2.2 of that change. Consumed by dossiq
and portaliq.

## ADDED Requirements

### Requirement: A note shows and sets whether it is internal or public

`CnNotesCard` SHALL render a chip on every note reading internal or
public, distinguished by its label and not by colour alone. A note
carrying no visibility value SHALL render as internal. The toggle that
changes it SHALL render only when the host passes `canSetVisibility` as
true, and the component SHALL NOT infer that permission from the current
user. The add-note form SHALL carry the same choice, defaulting to
internal. Both write paths SHALL send the value through one store action.
`canSetVisibility` SHALL default to false, so a host passing nothing
renders today's card.

#### Scenario: A handler writes an internal note

- **GIVEN** a case page whose host passes `canSetVisibility` as true
- **WHEN** the handler writes a note and leaves the choice as it stands
- **THEN** the note is written internal and its chip reads internal

#### Scenario: A public note is a deliberate act

- **GIVEN** the same handler
- **WHEN** they set the choice to public before writing
- **THEN** the note is written public and its chip reads public

#### Scenario: A reader gets no toggle

- **GIVEN** a portal page passing `canSetVisibility` as false
- **WHEN** the notes card renders
- **THEN** no toggle appears on any note and no add-note visibility choice is offered

#### Scenario: An old note reads as internal

- **GIVEN** a note written before the backend carried the flag
- **WHEN** it renders
- **THEN** its chip reads internal

#### Scenario: A host that passes nothing sees no change

- **GIVEN** an app on the new library version that passes neither prop
- **WHEN** the notes card renders
- **THEN** no chip, no toggle and no choice appear, and the card behaves as before

### Requirement: The feed filters on visibility and says when it cannot

`CnActivityTab` SHALL offer a visibility filter with all, internal and
public, sending `visibility` on the fetch. Each feed row SHALL carry its
own chip. A caller the server serves the public view to SHALL see the
filter fixed at public with the reason, rather than options that change
nothing. The visibility filter SHALL join the existing type, actor and
date filters without changing their behaviour.

#### Scenario: A handler reads only the public side

- **GIVEN** a handler on a case feed
- **WHEN** they set the visibility filter to public
- **THEN** the feed refetches with `visibility=public` and shows only public entries

#### Scenario: A portal reader sees an honest control

- **GIVEN** a caller without `update` on the object
- **WHEN** the feed renders
- **THEN** the visibility filter is fixed at public and states why

#### Scenario: The other filters are untouched

- **GIVEN** a feed filtered by actor and date
- **WHEN** the visibility filter is added
- **THEN** the actor and date filters keep their values and their behaviour
