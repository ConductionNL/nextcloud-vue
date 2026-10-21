# Proposal: user-settings-dialog-dq-board

## Why

CnUserSettingsDialog was built to the pipelinq board (PqPersoonlijk): an eyebrow, title and subtitle header, a nav with
icons, one section at a time and a footer with Close. The DqPersoonlijkeInstellingen board draws Nextcloud's own
settings dialog (NcAppInstellingen) instead: 900px wide, the title at the top of a tinted navigation column, every
section stacked on a white pane, a close icon in the corner, and no header or footer. COMPDIFF r20 flagged the width
(900 against 720), the ground, the title and content insets and the gap under the title. Ruben's rule: where the Dq and
Pt boards clash, Dq wins. The Pt board is redrawn in a design-system PR.

## What changes

- CnUserSettingsDialog takes the Dq layout. The Nextcloud links and the app group in the navigation stay (a deliberate
  live extra), and the "changes are saved straight away" line moves under the sections.
- Section icons are no longer drawn, in the navigation or before the headings.
- CnDialog gets `headless`, which leaves out the board header and keeps `name` as the accessible name.
- `eyebrow` / `subtitle` (and CnAppRoot `userSettingsEyebrow` / `userSettingsSubtitle`) are deprecated and ignored.
