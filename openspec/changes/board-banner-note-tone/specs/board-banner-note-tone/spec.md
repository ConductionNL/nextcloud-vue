# board-banner-note-tone Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-banner-note-tone](../../)

## Purpose

A warning or error banner is drawn as the boards draw it.

## ADDED Requirements

### Requirement: A board warning or error banner is a tinted box with an edge in its tone

In the board look a CnBannerWidget of variant `warning` or `error` SHALL draw a box tinted in its tone with a 1px edge
in that tone, radius 10px, 12px 14px of padding, no margin and the text in the main ink. A stat-row cell on an index
page that holds only a banner SHALL draw no card around it. A warning, error or success note in a settings card SHALL take the same box. Outside the board look NcNoteCard's own shape SHALL stay.

#### Scenario: PtInzending

- **GIVEN** a submission whose confirmation failed, in the board look
- **THEN** the error banner is a light red box with a 1px red-tinted edge on all four sides and radius 10px

#### Scenario: PtAccounts

- **GIVEN** the accounts index with registrations waiting, in the board look
- **THEN** the warning banner is a light yellow box with a 1px yellow-tinted edge, and no white card is drawn around it

#### Scenario: PtBeheerinstellingen

- **GIVEN** the Portaliq admin settings in the board look with a signing secret configured
- **THEN** the success note in the "Portal auth edge" card is a light green box with a 1px green-tinted edge and radius 10px
