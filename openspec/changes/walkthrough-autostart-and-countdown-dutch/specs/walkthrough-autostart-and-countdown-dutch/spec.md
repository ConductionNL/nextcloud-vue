# walkthrough-autostart-and-countdown-dutch Delta

## Purpose

A tour that opens on its own does not come back on every page load, and the
countdown tile reads in Dutch for a Dutch reader.

## ADDED Requirements

### Requirement: A tour that opens on its own opens once

When a tour with no saved progress shows its first step, `CnAppRoot` SHALL
record its progress as paused at that step in the user's preferences, so the
next page load keeps it hidden until the user picks "Continue". The open tour
SHALL run on unchanged, and reaching a later step SHALL record that step
without the pause.

#### Scenario: A user who never touches the tour

- **GIVEN** a user with no saved tour progress
- **WHEN** the first-visit tour opens on its own at its first step
- **THEN** the progress `{ tourId, stepId, index: 0, version, paused: true }` is saved once
- **AND** on the next page load the tour stays hidden
- @e2e exclude covered by `tests/components/CnAppRootWalkthroughProgress.spec.js` through the real CnAppRoot and CnWalkthrough; the reload half is the existing "stays hidden on the next page load" test

### Requirement: The countdown tile speaks Dutch

The countdown tile's headline strings SHALL have Dutch translations:
"Nog {count} dagen", "Nog 1 dag", "Vandaag", "1 dag te laat" and
"{count} dagen te laat".

#### Scenario: A term with 56 days left

- **GIVEN** a Dutch reader and a countdown 56 days before its date
- **WHEN** the tile renders its headline
- **THEN** it reads "Nog 56 dagen"
- @e2e exclude translation lookup is covered by `tests/l10n/countdownDutch.spec.js` with the real @nextcloud/l10n
