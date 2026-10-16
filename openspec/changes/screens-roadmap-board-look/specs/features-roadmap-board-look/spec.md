# features-roadmap-board-look Delta: screens-roadmap-board-look

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-roadmap-board-look](../../)

## Purpose

The Features and roadmap page in the board look, configured into the PqRoadmap or the DqFunctionaliteiten board.

## ADDED Requirements

### Requirement: A feature has one of four statuses

A feature's `status` SHALL read as available (`available`, `stable`, `done`, `released`, `shipped`), beta (`beta`,
`preview`), in progress (`in_progress`, `in-progress`, `building`, `development`) or planned (`planned`, `roadmap`,
`proposed`, `soon`). A feature without a status, or with an unknown one, SHALL read as available.

#### Scenario: Pipelinq's stable reads as available

- GIVEN a feature with `status: "stable"`
- WHEN the board draws it
- THEN its badge reads the available label

### Requirement: A feature reads in the reader's language

The board SHALL show `title_<lang>` and `summary_<lang>` for a reader whose language is `<lang>` when the feature has
them, else `title` and `summary`, else the slug as the title.

#### Scenario: A Dutch reader

- GIVEN a feature with `title` and `title_nl`
- WHEN a reader with language `nl` opens the page
- THEN the card shows `title_nl`

### Requirement: Features are grouped by category

The board SHALL group the features by `category` in the order of `config.categories`, features without a known
category first under no caption. In the `cards` layout each group SHALL carry the caption "N features, M available,
..." listing every status the group holds.

#### Scenario: Two categories

- GIVEN categories `{crm, contact}` and features in both
- WHEN the board draws them
- THEN the crm group comes before the contact group

### Requirement: The status filter shows a count per status

The filter SHALL offer All and each status, the in-progress option only when a feature has that status. As `chips`
each option SHALL show its count; as `segmented` it SHALL not. Picking an option SHALL show only the features with
that status and hide a group left empty.

#### Scenario: Filter on planned

- GIVEN features of several statuses
- WHEN the reader picks Planned
- THEN only planned features and their groups show

### Requirement: The next card lists the most requested issues

With `next` above 0 the board SHALL list that many forge issues, most reactions first, each with its title, a status
badge when one of its labels is mapped by `issueLabels`, the date it was opened and its number.

#### Scenario: A mapped label

- GIVEN `issueLabels: {"in progress": "in_progress"}` and an issue labelled "in progress"
- WHEN the card lists it
- THEN its badge reads the in-progress label

### Requirement: The default look is unchanged

In the default look the view SHALL render as before, with its hoisted sidebar. In the board look it SHALL publish no
sidebar; its links sit in the board's Actions menu.

#### Scenario: Board look

- GIVEN the board look
- WHEN the page mounts
- THEN the sidebar holder stays empty
