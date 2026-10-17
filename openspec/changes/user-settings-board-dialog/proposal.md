# Proposal: user-settings-board-dialog

## Why

The pipelinq board PqPersoonlijk draws the user settings as a board dialog: an eyebrow "Uw account", the title
"Persoonlijke instellingen", a subtitle, a left navigation listing the sections with their icons, and a footer
"Wijzigingen worden meteen bewaard · Pipelinq" with Sluiten. CnAppRoot drew NcAppSettingsDialog in every look.

## What changes

- New internal CnUserSettingsDialog: CnDialog in the board look (720px), the sections in a 200px navigation with
  icons, the footer note and a Close button. NcAppSettingsSection children register with it as they do with
  NcAppSettingsDialog (same injection key), so the sections stay the app's.
- CnAppRoot draws it under the board look; `userSettingsEyebrow` and `userSettingsSubtitle` override the copy.
- The library's own sections (notifications, credentials, walkthrough, integrations) carry a navigation icon under
  the board look.

The Nextcloud look keeps NcAppSettingsDialog unchanged.
